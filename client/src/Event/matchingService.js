import { api } from "../api"

/**
 * שולחת בקשה לשמירת שיבוץ בין שתי רשומות באירוע.
 *
 * @param {string} eventId - מזהה האירוע שאליו שייכות הרשומות.
 * @param {string} childEventId - מזהה רשומת הילד באירוע.
 * @param {string} volunteerEventId - מזהה רשומת המתנדבת באירוע.
 * @returns {Promise<Object>} הרשומות המעודכנות שהשרת מחזיר.
 */
export const saveMatchingAssignment = async (eventId, childEventId, volunteerEventId) => {
    const response = await api.post("/child-event/assign", {
        eventId,
        childEventId,
        volunteerEventId,
    })
    return response.data
}

/**
 * שולחת בקשה לביטול הקשר ההדדי בין ילד למתנדבת באירוע.
 *
 * @param {string} eventId - מזהה האירוע שאליו שייכות הרשומות.
 * @param {string} childEventId - מזהה רשומת הילד באירוע.
 * @param {string} volunteerEventId - מזהה רשומת המתנדבת באירוע.
 * @returns {Promise<Object>} אישור הביטול שהשרת מחזיר.
 */
export const cancelMatchingAssignment = async (eventId, childEventId, volunteerEventId) => {
    const response = await api.post("/child-event/unassign", {
        eventId,
        childEventId,
        volunteerEventId,
    })
    return response.data
}
