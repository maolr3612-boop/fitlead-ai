type Source = { id: string; url: string };
export default function SourceReference({
  source,
  label = "查看来源 ↗",
}: {
  source: Source;
  label?: string;
}) {
  return (
    <>
      <a
        className="text-link"
        href={source.url}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>
      {source.id === "efsa-water" && (
        <>
          <p className="note" style={{ marginTop: 12 }}>
            期刊原文可能有访问限制，也可阅读 EFSA 官网的参考值说明。
          </p>
          <a
            className="text-link"
            href="https://www.efsa.europa.eu/en/press/news/nda100326"
            target="_blank"
            rel="noreferrer"
          >
            EFSA 官方摘要（备用链接） ↗
          </a>
        </>
      )}
    </>
  );
}
