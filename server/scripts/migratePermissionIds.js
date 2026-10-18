require("dotenv").config()
const { createHmac } = require("crypto")
const mongoose = require("mongoose")
const Permission = require("../models/Permission")
const { getJwtSecret } = require("../config/jwt")
const { hashPassword } = require("../utils/password")

const isBcryptHash = value => /^\$2[aby]\$\d{2}\$/.test(value)
const createNameLookup = name => createHmac("sha256", getJwtSecret()).update(name).digest("hex")

const migratePermissionIds = async () => {
    if (!process.env.DATABASE_URI) {
        throw new Error("DATABASE_URI must be set before migrating permission records")
    }

    try {
        await mongoose.connect(process.env.DATABASE_URI)
        const permissions = await Permission.collection.find({}).sort({ _id: 1 }).toArray()
        const usedIds = new Set()
        const usedNames = new Set()
        const maxExistingId = permissions.reduce((max, permission) =>
            Number.isSafeInteger(permission.id) && permission.id > max ? permission.id : max, 0)
        let nextId = maxExistingId + 1
        let maxId = maxExistingId
        const updates = []

        for (const permission of permissions) {
            let id = permission.id
            if (id === undefined) {
                id = nextId++
            } else if (!Number.isSafeInteger(id) || id < 1 || usedIds.has(id)) {
                throw new Error(`Permission ${permission._id} has an invalid or duplicate numeric id`)
            }
            usedIds.add(id)
            maxId = Math.max(maxId, id)

            if (typeof permission.name !== "string" || !permission.name) {
                throw new Error(`Permission ${permission._id} has no usable name`)
            }

            let name = permission.name
            let nameLookup = permission.nameLookup
            if (!isBcryptHash(name)) {
                name = name.trim()
                if (!name || Buffer.byteLength(name, "utf8") > 72) {
                    throw new Error(`Permission ${permission._id} has an invalid name`)
                }
                nameLookup = createNameLookup(name)
                name = await hashPassword(name)
            } else if (!nameLookup) {
                throw new Error(`Permission ${permission._id} has a hashed name without its uniqueness lookup`)
            }

            if (usedNames.has(nameLookup)) {
                throw new Error(`Duplicate permission name detected for record ${permission._id}`)
            }
            usedNames.add(nameLookup)
            updates.push({
                updateOne: {
                    filter: { _id: permission._id },
                    update: { $set: { id, name, nameLookup } }
                }
            })
        }

        if (updates.length > 0) {
            await Permission.collection.bulkWrite(updates)
        }
        await Permission.collection.createIndex({ id: 1 }, { unique: true })
        await Permission.collection.createIndex({ nameLookup: 1 }, { unique: true })
        await mongoose.connection.collection("counters").updateOne(
            { _id: "permission" },
            { $max: { seq: maxId } },
            { upsert: true }
        )
        console.log(`Migrated ${updates.length} permission records`)
    } finally {
        await mongoose.disconnect()
    }
}

migratePermissionIds().catch(error => {
    console.error("Failed to migrate permission records:", error)
    process.exitCode = 1
})
