export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="กำลังโหลดรายการงาน">
      <div className="page-head">
        <div>
          <div className="skel" style={{ width: 160, height: 26 }} />
          <div className="skel" style={{ width: 240, height: 16, marginTop: 10 }} />
        </div>
      </div>
      <div className="card">
        <div className="filters">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="field">
              <div className="skel" style={{ width: 70, height: 14 }} />
              <div className="skel" style={{ width: "100%", height: 44, marginTop: 6 }} />
            </div>
          ))}
          <div className="skel" style={{ width: 90, height: 40 }} />
        </div>
        <div className="stack-sm" style={{ padding: 20 }}>
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="skel" style={{ height: 18, width: `${92 - (i % 3) * 12}%` }} />)}
        </div>
      </div>
    </div>
  );
}
