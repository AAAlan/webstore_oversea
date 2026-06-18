const LABELS = {
  "zh-CN": { ended: "活动已结束", remaining: "剩余", hour: "小时", day: "天" },
  "zh-TW": { ended: "活動已結束", remaining: "剩餘", hour: "小時", day: "天" },
  en: { ended: "Expired", remaining: "Remaining", hour: "hours", day: "days" },
  ja: { ended: "終了しました", remaining: "残り", hour: "時間", day: "日" },
  ko: { ended: "종료됨", remaining: "남은", hour: "시간", day: "일" },
};

function localeLabel(locale) {
  return LABELS[locale] ?? LABELS["zh-CN"];
}

export function computeRemainingDays(timeLimitEnd, now = Date.now()) {
  if (!timeLimitEnd) return null;
  const end = new Date(timeLimitEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export function formatRemainingDaysLabel(days, locale = "zh-CN") {
  if (days == null) return null;
  const labels = localeLabel(locale);
  if (days <= 0) return labels.ended;
  if (locale === "en") return `${labels.remaining} ${days} ${labels.day}`;
  if (locale === "ja" || locale === "ko") return `${labels.remaining}${days}${labels.day}`;
  return `${labels.remaining}${days}${labels.day}`;
}

export function formatRemainingTimeLabel(timeLimitEnd, locale = "zh-CN", now = Date.now()) {
  if (!timeLimitEnd) return null;
  const end = new Date(timeLimitEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  if (diff <= 0) return localeLabel(locale).ended;
  const hours = Math.ceil(diff / 3600000);
  if (hours < 24) {
    const labels = localeLabel(locale);
    if (locale === "en") return `${labels.remaining} ${hours} ${labels.hour}`;
    return `${labels.remaining}${hours}${labels.hour}`;
  }
  return formatRemainingDaysLabel(Math.ceil(hours / 24), locale);
}
