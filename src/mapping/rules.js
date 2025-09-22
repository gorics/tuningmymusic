export const STOPWORDS = {
  en: ["remastered", "remaster", "live", "version", "official", "audio", "video"],
  ko: ["라이브", "버전", "공식", "오디오"],
};

export const FEATURE_WORDS = ["feat", "featuring", "ft", "with"];

export const VERSION_TAGS = [
  "remaster",
  "remastered",
  "remastering",
  "live",
  "acoustic",
  "instrumental",
  "official video",
  "official audio",
  "lyrics",
  "lyric",
  "mv",
  "m/v",
];

export const YEAR_TOLERANCE = 2;

export const SCORE_THRESHOLDS = {
  auto: 75,
  review: 60,
};

export const TOKEN_OPTIONS = {
  separators: /[\s,;:\-\/\[\]()]+/g,
};
