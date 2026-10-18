require("dotenv").config()
const mongoose = require("mongoose")
const Parent = require("../models/Parent")

const migrateParentUsername = async () => {
    if (!process.env.DATABASE_URI) {
        throw new Error("DATABASE_URI must be set before migrating parent records")
    }

    try {
        await mongoose.connect(process.env.DATABASE_URI)
        const indexes = await Parent.collection.indexes()
        const usernameIndexes = indexes.filter(index =>
            index.key && Object.prototype.hasOwnProperty.call(index.key, "UserName")
        )

        for (const index of usernameIndexes) {
            await Parent.collection.dropIndex(index.name)
        }

        const result = await Parent.collection.updateMany(
            { UserName: { $exists: true } },
            { $unset: { UserName: "" } }
        )
        console.log(`Removed legacy UserName values from ${result.modifiedCount} parent records`)
    } finally {
        await mongoose.disconnect()
    }
}

migrateParentUsername().catch(error => {
    console.error("Failed to migrate parent records:", error)
    process.exitCode = 1
})
