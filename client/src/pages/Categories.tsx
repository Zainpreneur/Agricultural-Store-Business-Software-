import { useEffect, useState, FormEvent } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { Category } from '../types';
import Modal from '../components/Modal';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api
      .get<Category[]>('/categories')
      .then((res) => setCategories(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openNew() {
    setEditing(null);
    setName('');
    setError('');
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, { name });
      } else {
        await api.post('/categories', { name });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Categories</h1>
        <button className="btn-primary" onClick={openNew}>
          + New Category
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th># Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center text-stone-400 py-6">
                  Loading…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-stone-400 py-6">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c._count?.products ?? 0}</td>
                  <td className="text-right space-x-2">
                    <button className="text-agri-600 hover:underline text-xs" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => handleDelete(c)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Category' : 'New Category'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
