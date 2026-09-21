export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 애플 시스템 서체를 그대로 쓴다. 맥·아이폰에서는 SF 와 Apple SD
      // Gothic Neo 가 잡히고, 나머지 환경은 Noto Sans KR 로 떨어진다.
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          "sans-serif",
        ],
      },
      // 흰 바탕 위에서 전부 4.5:1 이상이다. #86868B(3.6:1)는 쓰지 않는다.
      colors: {
        ink: "#1D1D1F",
        sub: "#424245",
        muted: "#6E6E73",   // 5.1:1
        rule: "#D2D2D7",
        tint: "#F5F5F7",
        nav: "#FBFBFD",
        link: "#0066CC",    // 5.6:1
        key: "#0071E3",     // 흰 글자와 4.7:1
        up: "#C4001A",
        down: "#0B4EC2",
        upTint: "#FFE9E9",
        downTint: "#E7EFFF",
        flatTint: "#F0F0F2",
      },
      maxWidth: { page: "820px", chart: "720px" },
    },
  },
  plugins: [],
}
