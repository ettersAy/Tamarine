export interface CSVRow {
  student_name: string | null;
  total_score: number | null;
  max_score: number | null;
  submitted_at: string;
  corrected_at: string | null;
}

function esc(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function generateSubmissionsCSV(rows: CSVRow[]): string {
  const header = ['Student Name', 'Total Score', 'Max Score', 'Percentage', 'Submitted At', 'Corrected At'];

  const data = rows.map((r) => [
    r.student_name || 'Anonymous',
    r.total_score ?? '',
    r.max_score ?? '',
    r.max_score && r.total_score != null
      ? `${Math.round((r.total_score / r.max_score) * 100)}%`
      : 'N/A',
    r.submitted_at,
    r.corrected_at || '',
  ]);

  return [header, ...data]
    .map((row) => row.map(esc).join(','))
    .join('\n');
}
