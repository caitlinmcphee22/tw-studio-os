type Doc = { id: number; category: string; title: string; body: string; owner: string; requires_ack: boolean };

const CATS = ["Policies and procedures", "Clinical protocols", "Templates and forms", "People and growth", "Brand and content", "Client handouts"];

export default function DocForm({ action, doc }: { action: (f: FormData) => Promise<void>; doc?: Doc }) {
  return (
    <form action={action} className="stack">
      {doc && <input type="hidden" name="id" value={doc.id} />}
      <label><span className="k">Title</span><input name="title" required defaultValue={doc?.title} /></label>
      <label><span className="k">Section</span>
        <select name="category" defaultValue={doc?.category || CATS[0]}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label><span className="k">Owner</span><input name="owner" defaultValue={doc?.owner || "Caitlin"} /></label>
      <label><span className="k">Content</span><textarea name="body" rows={18} defaultValue={doc?.body} /></label>
      <label className="check"><input type="checkbox" name="requires_ack" defaultChecked={doc?.requires_ack} /> Everyone must read and acknowledge this</label>
      {doc && <label className="check"><input type="checkbox" name="bump" /> This is a real change: make it a new version and ask everyone to acknowledge again</label>}
      <p className="m small">Never put client names or health details in the library.</p>
      <div><button className="btn" type="submit">Save</button></div>
    </form>
  );
}
