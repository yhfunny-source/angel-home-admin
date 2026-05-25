import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { getKBCategories, getKBArticles, createKBArticle, updateKBArticle, deleteKBArticle, createKBCategory, updateKBCategory, deleteKBCategory, formatDateTime } from '@/lib/api';
import type { KBArticle, KBCategory } from '@/types';

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);
  const [editForm, setEditForm] = useState({ title: '', categoryId: '', content: '', tags: '' });

  // 分类编辑状态
  const [showCatEdit, setShowCatEdit] = useState(false);
  const [editCat, setEditCat] = useState<KBCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', sortOrder: 0 });

  // 权限判断
  const userStr = storage.get('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const roles: string[] = user?.roles || [];
  const canEdit = roles.includes('admin') || roles.includes('BOSS');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, arts] = await Promise.all([
        getKBCategories(),
        getKBArticles({ category: activeCategory !== 'all' ? activeCategory : undefined, search: search || undefined })
      ]);
      setCategories(cats);
      setArticles(arts);
      setError('');
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 打开新增/编辑弹窗
  const openEdit = (article?: KBArticle) => {
    if (!canEdit) return;
    if (article) {
      setEditArticle(article);
      setEditForm({ title: article.title, categoryId: article.categoryId || '', content: article.content, tags: article.tags || '' });
    } else {
      setEditArticle(null);
      setEditForm({ title: '', categoryId: categories[0]?.id || '', content: '', tags: '' });
    }
    setIsEditing(true);
  };

  // 保存文章
  const handleSave = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;
    const cat = categories.find(c => c.id === editForm.categoryId);
    try {
      if (editArticle) {
        await updateKBArticle(editArticle.id, {
          title: editForm.title,
          categoryId: editForm.categoryId || undefined,
          categoryName: cat?.name,
          content: editForm.content,
          tags: editForm.tags
        });
      } else {
        await createKBArticle({
          title: editForm.title,
          categoryId: editForm.categoryId || undefined,
          categoryName: cat?.name,
          content: editForm.content,
          tags: editForm.tags
        });
      }
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  };

  // 删除文章
  const handleDelete = async (id: string) => {
    if (!canEdit || !confirm('确定删除这篇文章？')) return;
    try {
      await deleteKBArticle(id);
      setSelectedArticle(null);
      loadData();
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  // 保存分类
  const handleSaveCat = async () => {
    if (!catForm.name.trim()) return;
    try {
      if (editCat) {
        await updateKBCategory(editCat.id, { name: catForm.name, sortOrder: catForm.sortOrder });
      } else {
        await createKBCategory({ name: catForm.name, sortOrder: catForm.sortOrder });
      }
      setShowCatEdit(false);
      loadData();
    } catch (err: any) {
      alert('保存分类失败: ' + err.message);
    }
  };

  // 删除分类
  const handleDeleteCat = async (id: string) => {
    if (!canEdit || !confirm('删除分类后，关联文章将变为"未分类"，确定删除？')) return;
    try {
      await deleteKBCategory(id);
      loadData();
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  const categoryLabel = (catId?: string) => {
    if (!catId) return '未分类';
    return categories.find(c => c.id === catId)?.name || catId;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-30" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8C6A53, #7A5C48)' }}>
              <span className="text-white font-bold text-sm">&#128218;</span>
            </div>
            <span className="font-semibold text-sm sm:text-base" style={{ color: '#4A3A2F' }}>&#24223;&#22687;&#30693;&#35782;&#24211;</span>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button size="sm" onClick={() => openEdit()} className="text-xs h-8 bg-[#C89F7F] hover:bg-[#B08D6F] text-white border-0">
                + &#26032;&#24314;&#25991;&#31456;
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} className="text-xs h-8" style={{ color: '#726255', borderColor: '#E8DFD2' }}>&#36820;&#22238;</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* 搜索 */}
        <div className="mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="&#25628;&#32034;&#30693;&#35782;&#24211;&#20869;&#23481;..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD2] text-sm bg-white"
          />
        </div>

        {/* 分类 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${activeCategory === 'all' ? 'bg-[#C89F7F] text-white' : 'bg-white text-[#726255] border border-[#E8DFD2]'}`}>
            &#20840;&#37096;
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${activeCategory === c.id ? 'bg-[#C89F7F] text-white' : 'bg-white text-[#726255] border border-[#E8DFD2]'}`}>
              {c.name}
            </button>
          ))}
          {canEdit && (
            <button onClick={() => { setEditCat(null); setCatForm({ name: '', sortOrder: 0 }); setShowCatEdit(true); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm bg-white text-[#C89F7F] border border-[#C89F7F] hover:bg-[#FAF5F0] transition-colors">
              + &#20998;&#31867;
            </button>
          )}
        </div>

        {/* 加载/错误 */}
        {loading && <div className="text-center py-12 text-[#A08F80]">&#21152;&#36733;&#20013;...</div>}
        {error && <div className="text-center py-12 text-red-500">{error}</div>}

        {/* 文章卡片 */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articles.map(a => (
              <div key={a.id} onClick={() => setSelectedArticle(a)}
                className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm p-4 cursor-pointer hover:shadow-md transition-all hover:border-[#C89F7F]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF5F0] text-[#A87F5F]">{categoryLabel(a.categoryId)}</span>
                </div>
                <h3 className="font-semibold text-[#4A3A2F] mb-2">{a.title}</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(a.tags || '').split(',').filter(Boolean).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8DFD2] text-[#726255]">{t}</span>)}
                </div>
                <p className="text-[10px] text-[#A08F80]">&#21019;&#24314;&#20110; {formatDateTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-12 text-[#A08F80]">&#26242;&#26080;&#30456;&#20851;&#20869;&#23481;</div>
        )}
      </div>

      {/* 文章详情弹窗 */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setSelectedArticle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-5 max-h-[80vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF5F0] text-[#A87F5F]">{categoryLabel(selectedArticle.categoryId)}</span>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedArticle(null); openEdit(selectedArticle); }}
                    className="text-xs px-3 py-1 rounded-full bg-[#FAF5F0] text-[#726255] hover:bg-[#E8DFD2] transition-colors">&#32534;&#36753;</button>
                  <button onClick={() => handleDelete(selectedArticle.id)}
                    className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">&#21024;&#38500;</button>
                </div>
              )}
            </div>
            <h2 className="text-lg font-bold text-[#4A3A2F] mb-3">{selectedArticle.title}</h2>
            <div className="flex flex-wrap gap-1 mb-4">
              {(selectedArticle.tags || '').split(',').filter(Boolean).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8DFD2] text-[#726255]">{t}</span>)}
            </div>
            <div className="bg-[#FAF5F0] rounded-xl p-4 text-sm text-[#4A3A2F] leading-relaxed whitespace-pre-line">
              {selectedArticle.content}
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-[#A08F80]">
              <span>&#21019;&#24314;&#65306;{formatDateTime(selectedArticle.createdAt)}</span>
              {selectedArticle.updatedAt && selectedArticle.updatedAt !== selectedArticle.createdAt && (
                <span>&#26356;&#26032;&#65306;{formatDateTime(selectedArticle.updatedAt)}</span>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setSelectedArticle(null)}>&#20851;&#38381;</Button>
          </div>
        </div>
      )}

      {/* 文章编辑弹窗 */}
      {isEditing && canEdit && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setIsEditing(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-5 max-h-[85vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editArticle ? '&#32534;&#36753;&#25991;&#31456;' : '&#26032;&#24314;&#25991;&#31456;'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#26631;&#39064;</label>
                <input type="text" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" placeholder="&#25991;&#31456;&#26631;&#39064;" />
              </div>
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#20998;&#31867;</label>
                <select value={editForm.categoryId}
                  onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm bg-white">
                  <option value="">&#26410;&#20998;&#31867;</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#26631;&#31614;&#65288;&#29992;&#36887;&#21495;&#20998;&#38548;&#65289;</label>
                <input type="text" value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" placeholder="&#22914;&#65306;&#23458;&#26381;,&#27969;&#31243;" />
              </div>
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#20869;&#23481;</label>
                <textarea value={editForm.content}
                  onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm resize-none" placeholder="&#25991;&#31456;&#27491;&#25991;&#20869;&#23481;..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>&#21462;&#28040;</Button>
              <Button className="flex-1 bg-[#C89F7F] hover:bg-[#B08D6F] text-white border-0" onClick={handleSave}>&#20445;&#23384;</Button>
            </div>
          </div>
        </div>
      )}

      {/* 分类编辑弹窗 */}
      {showCatEdit && canEdit && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setShowCatEdit(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-5" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editCat ? '&#32534;&#36753;&#20998;&#31867;' : '&#26032;&#24314;&#20998;&#31867;'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#20998;&#31867;&#21517;&#31216;</label>
                <input type="text" value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" placeholder="&#20998;&#31867;&#21517;&#31216;" />
              </div>
              <div>
                <label className="text-sm text-[#726255] block mb-1">&#25490;&#24207;</label>
                <input type="number" value={catForm.sortOrder}
                  onChange={e => setCatForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              {editCat && (
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteCat(editCat.id)}>&#21024;&#38500;</Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => setShowCatEdit(false)}>&#21462;&#28040;</Button>
              <Button className="flex-1 bg-[#C89F7F] hover:bg-[#B08D6F] text-white border-0" onClick={handleSaveCat}>&#20445;&#23384;</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
