export function buildInClause(values: string[]) {
  if (!values.length) {
    return { clause: '(NULL)', params: [] as string[] };
  }
  const placeholders = values.map(() => '?').join(',');
  return { clause: `(${placeholders})`, params: values };
}
