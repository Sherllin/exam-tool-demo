import type { ClassAverageData } from "@/lib/types";


export function AverageTable({ data }: { data: ClassAverageData }) {
  return (
    <section className="table-card">
      <div className="table-card-header">
        <div>
          <h2>班级平均分明细</h2>
          <p>每个班级一行，同时展示总分及各科平均分</p>
        </div>
        <span className="status-tag status-blue">单次考试</span>
      </div>
      <div className="table-scroll">
        <table className="data-table average-table">
          <thead>
            <tr>
              <th scope="col">班级</th>
              <th scope="col">参考人数</th>
              <th scope="col">总分平均分</th>
              {data.subjects.map((subject) => (
                <th scope="col" key={subject}>{subject}平均分</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.class_name}>
                <th scope="row">{row.class_name}</th>
                <td>{row.student_count}</td>
                <td className="score-cell total-score">{row.total_average.toFixed(1)}</td>
                {data.subjects.map((subject) => (
                  <td className="score-cell" key={subject}>
                    {row.subject_averages[subject]?.toFixed(1) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="method-note">{data.method_note}</p>
    </section>
  );
}
