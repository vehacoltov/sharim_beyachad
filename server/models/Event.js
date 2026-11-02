const mongoose = require('mongoose')
const Counter = require('./Counter')
const eventSchema = mongoose.Schema({
    name:{
        type:String,
        trim:true,
        required:true
    },
    id:{
        type:Number,
        index:true,
        unique:true,
        required:true,
        min:1,
        validate: Number.isInteger
    },
    Children: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'ChildInEvent',
        default: []
    },
    sumOfChilds: {
        type: Number,
        required:true,
        min:1,
        validate: Number.isInteger
    },
    SavedPlaces: {
        type: Number,
        required:true,
        min:0,
        validate: Number.isInteger
    },
    isActive: {
        type: Boolean,
        required:true
    },
    Volunteers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'VolunteerInEvent',
        default: []
    },
    date:{
        type:Date,
        required:true
    },
    startReg: {
        type: Date,
        required:true
    },
    endReg: {
        type: Date,
        required:true
    },
    hour: {
        type: String,
        required:true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    detailingForParent: {
        type: String,
        trim:true,
        required:true
    },
    detailingForVolun:{
        type:String,
        trim:true,
        required:true
    }
}, {
    timestamps: true
})

eventSchema.pre('validate', async function validateEventRules() {
    if (this.isNew && this.id == null) {
        const getNextEventId = async () => {
            const highestEvent = await this.constructor
                .findOne({ id: { $type: 'number' } })
                .sort({ id: -1 })
                .select('id')
                .lean()
            const highestId = highestEvent?.id || 0

            try {
                await Counter.findOneAndUpdate(
                    { _id: 'event' },
                    { $max: { seq: highestId } },
                    { new: true, upsert: true }
                )
            } catch (error) {
                if (error.code !== 11000) throw error
            }

            try {
                const counter = await Counter.findOneAndUpdate(
                    { _id: 'event' },
                    { $inc: { seq: 1 } },
                    { new: true }
                )
                return counter.seq
            } catch (error) {
                if (error.code !== 11000) throw error
                const counter = await Counter.findOneAndUpdate(
                    { _id: 'event' },
                    { $inc: { seq: 1 } },
                    { new: true }
                )
                return counter.seq
            }
        }

        this.id = await getNextEventId()
    }

    if (this.startReg && this.endReg && this.startReg >= this.endReg) {
        this.invalidate('startReg', 'פתיחת ההרשמה חייבת להיות לפני סיום ההרשמה')
    }

    if (
        Number.isFinite(this.SavedPlaces)
        && Number.isFinite(this.sumOfChilds)
        && this.SavedPlaces >= this.sumOfChilds
    ) {
        this.invalidate('SavedPlaces', 'מספר המקומות השמורים חייב להיות קטן ממספר הילדים')
    }
})

module.exports = mongoose.model('Event', eventSchema)