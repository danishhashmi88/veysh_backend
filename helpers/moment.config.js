import moment from 'moment-timezone';

/** Set default timezone globally */
moment.tz.setDefault(process.env.TIME_ZONE || 'Asia/Kolkata');

export default moment;
