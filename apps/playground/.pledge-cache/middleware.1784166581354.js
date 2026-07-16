function middleware(req) {
  const url = new URL(req.url);
  if (url.pathname === "/old-home") {
    return {
      redirect: { destination: "/", permanent: true }
    };
  }
  return {
    next: true,
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  };
}
export {
  middleware as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiPHN0ZGluPiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUgeyBNaWRkbGV3YXJlUmVzdWx0IH0gZnJvbSAncGxlZGdlc3RhY2snO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtaWRkbGV3YXJlKHJlcTogUmVxdWVzdCk6IE1pZGRsZXdhcmVSZXN1bHQge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuXG4gIC8vIEV4YW1wbGU6IFJlZGlyZWN0IC9vbGQtaG9tZSB0byAvXG4gIGlmICh1cmwucGF0aG5hbWUgPT09ICcvb2xkLWhvbWUnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZGlyZWN0OiB7IGRlc3RpbmF0aW9uOiAnLycsIHBlcm1hbmVudDogdHJ1ZSB9LFxuICAgIH07XG4gIH1cblxuICAvLyBFeGFtcGxlOiBBZGQgc2VjdXJpdHkgaGVhZGVycyB0byBhbGwgcmVzcG9uc2VzXG4gIHJldHVybiB7XG4gICAgbmV4dDogdHJ1ZSxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnWC1GcmFtZS1PcHRpb25zJzogJ0RFTlknLFxuICAgICAgJ1gtQ29udGVudC1UeXBlLU9wdGlvbnMnOiAnbm9zbmlmZicsXG4gICAgICAnUmVmZXJyZXItUG9saWN5JzogJ3N0cmljdC1vcmlnaW4td2hlbi1jcm9zcy1vcmlnaW4nLFxuICAgIH0sXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiQUFFZSxTQUFSLFdBQTRCLEtBQWdDO0FBQ2pFLFFBQU0sTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHO0FBRzNCLE1BQUksSUFBSSxhQUFhLGFBQWE7QUFDaEMsV0FBTztBQUFBLE1BQ0wsVUFBVSxFQUFFLGFBQWEsS0FBSyxXQUFXLEtBQUs7QUFBQSxJQUNoRDtBQUFBLEVBQ0Y7QUFHQSxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxtQkFBbUI7QUFBQSxNQUNuQiwwQkFBMEI7QUFBQSxNQUMxQixtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
