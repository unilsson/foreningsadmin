function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function createMeetingPreview(input, config) {
  const {
    date,
    startTime,
    endTime,
    location
  } = input ?? {};

  const errors = [];

  if (!isDate(date ?? "")) {
    errors.push("Datum måste anges som YYYY-MM-DD.");
  }

  if (!isTime(startTime ?? "")) {
    errors.push("Starttid måste anges som HH:MM.");
  }

  if (!isTime(endTime ?? "")) {
    errors.push("Sluttid måste anges som HH:MM.");
  }

  if (!location?.trim()) {
    errors.push("Plats måste anges.");
  }

  if (
    isTime(startTime ?? "") &&
    isTime(endTime ?? "") &&
    endTime <= startTime
  ) {
    errors.push("Sluttiden måste vara senare än starttiden.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const meetingTitle = config?.meeting?.title ?? "Styrelsemöte";
  const organisationName = config?.organisation?.name ?? "";

  return {
    ok: true,
    meeting: {
      title: organisationName
        ? `${meetingTitle} – ${organisationName}`
        : meetingTitle,
      date,
      startTime,
      endTime,
      location: location.trim()
    }
  };
}
