export const translations = {
  en: {
    welcome_title: "ListBridge",
    welcome_subtitle: "Transfer playlists between Spotify and YouTube securely in your browser.",
    connect_title: "Connect your providers",
    select_title: "Select playlists",
    map_title: "Review matches",
    transfer_title: "Transfer playlists",
    report_title: "Transfer report",
    connect_spotify: "Connect Spotify",
    connect_google: "Connect Google",
    disconnect: "Disconnect",
    connect_client_id_hint: "Add a Client ID to oauth.config.js to enable sign-in.",
    export_json: "Export JSON",
    export_csv: "Export CSV",
    import_json: "Import JSON",
    import_csv: "Import CSV",
    resume_banner: "You have an unfinished transfer. Resume?",
  },
  ko: {
    welcome_title: "ListBridge",
    welcome_subtitle: "브라우저만으로 Spotify와 YouTube 간 재생목록을 안전하게 옮기세요.",
    connect_title: "연결",
    select_title: "재생목록 선택",
    map_title: "매칭 검토",
    transfer_title: "전송",
    report_title: "보고서",
    connect_spotify: "Spotify 연결",
    connect_google: "Google 연결",
    disconnect: "연결 해제",
    connect_client_id_hint: "oauth.config.js 파일에 클라이언트 ID를 입력하면 로그인 버튼이 활성화됩니다.",
    export_json: "JSON 내보내기",
    export_csv: "CSV 내보내기",
    import_json: "JSON 가져오기",
    import_csv: "CSV 가져오기",
    resume_banner: "미완료 전송이 있습니다. 이어서 진행하시겠습니까?",
  },
};

export const locales = Object.keys(translations);

export function translate(key, locale = "en") {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
