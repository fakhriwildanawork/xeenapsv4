
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { LibraryItem, LibraryType } from '../../types';
import { deleteLibraryItem, saveLibraryItem } from '../../services/gasService';
import { 
  TrashIcon, 
  BookmarkIcon, 
  StarIcon, 
  PlusIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  EyeIcon,
  DocumentIcon,
  LinkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid,
  CheckCircleIcon as CheckCircleSolid
} from '@heroicons/react/24/solid';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter, 
  StandardCheckbox,
  StandardGridContainer,
  StandardItemCard
} from '../Common/TableComponents';
import { 
  StandardQuickAccessBar, 
  StandardQuickActionButton, 
  StandardPrimaryButton as AddButton,
  StandardPrimaryButton, 
  StandardFilterButton 
} from '../Common/ButtonComponents';
import LibraryDetailView from './LibraryDetailView';

interface LibraryMainProps {
  items: LibraryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  globalSearch: string;
}

type SortConfig = {
  key: keyof LibraryItem | 'none';
  direction: 'asc' | 'desc' | null;
};

const LibraryMain: React.FC<LibraryMainProps> = ({ items, isLoading, onRefresh, globalSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | LibraryType>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'title', direction: 'asc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 20 : 25;
  const filters: ('All' | LibraryType)[] = ['All', LibraryType.LITERATURE, LibraryType.TASK, LibraryType.PERSONAL, LibraryType.OTHER];
  const effectiveSearch = localSearch || globalSearch;

  const handleSort = (key: keyof LibraryItem) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : 'none', direction });
  };

  const getSortIcon = (key: keyof LibraryItem) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
    if (sortConfig.direction === 'asc') return <ChevronUpIcon className="w-3 h-3 text-[#004A74]" />;
    if (sortConfig.direction === 'desc') return <ChevronDownIcon className="w-3 h-3 text-[#004A74]" />;
    return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      const query = effectiveSearch.toLowerCase();
      const matchesSearch = !query || Object.values(item).some(val => {
        if (typeof val === 'string') return val.toLowerCase().includes(query);
        if (Array.isArray(val)) return val.some(v => typeof v === 'string' && v.toLowerCase().includes(query));
        return false;
      });

      const matchesCategory = activeFilter === 'All' || item.type === activeFilter;
      const isFavoritePath = location.pathname === '/favorite';
      const isBookmarkPath = location.pathname === '/bookmark';
      const isResearchPath = location.pathname === '/research';
      
      const matchesPath = 
        (isFavoritePath ? item.isFavorite : true) && 
        (isBookmarkPath ? item.isBookmarked : true) &&
        (isResearchPath ? (item.type === LibraryType.LITERATURE || item.type === LibraryType.TASK) : true);

      return matchesSearch && matchesCategory && matchesPath;
    });

    if (sortConfig.key !== 'none' && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const valA = (a[sortConfig.key as keyof LibraryItem] || '').toString().toLowerCase();
        const valB = (b[sortConfig.key as keyof LibraryItem] || '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, effectiveSearch, activeFilter, location.pathname, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const paginatedItems = filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteLibraryItem(id);
    }
    setSelectedIds([]);
    onRefresh();
  };

  const handleBatchAction = async (property: 'isBookmarked' | 'isFavorite') => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyFalse = selectedItems.some(i => !i[property]);
    const newValue = anyFalse;
    for (const item of selectedItems) {
      await saveLibraryItem({ ...item, [property]: newValue });
    }
    onRefresh();
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-12 w-full skeleton rounded-xl" />
        <div className="h-64 w-full skeleton rounded-2xl" />
      </div>
    );
  }

  const tableColumns: { key: keyof LibraryItem; label: string; width?: string }[] = [
    { key: 'title', label: 'Title', width: '300px' },
    { key: 'author', label: 'Author(s)', width: '200px' },
    { key: 'publisher', label: 'Publisher', width: '200px' },
    { key: 'year', label: 'Year', width: '80px' },
    { key: 'category', label: 'Category', width: '150px' },
    { key: 'topic', label: 'Topic', width: '150px' },
    { key: 'subTopic', label: 'Sub Topic', width: '150px' },
    { key: 'createdAt', label: 'Created At', width: '150px' },
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto no-scrollbar space-y-4 animate-in fade-in duration-500 relative pr-1">
      {/* Detail Overlay */}
      {selectedItem && (
        <LibraryDetailView item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0">
        <SmartSearchBox value={localSearch} onChange={setLocalSearch} />
        <AddButton onClick={() => navigate('/add')} icon={<PlusIcon className="w-5 h-5" />}>Add Collection</AddButton>
      </div>

      <div className="flex items-center justify-between lg:justify-start gap-4 shrink-0 relative z-[30]">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
          {filters.map(filter => (
            <StandardFilterButton key={filter} isActive={activeFilter === filter} onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}>{filter}</StandardFilterButton>
          ))}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative lg:hidden shrink-0">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-2.5 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon className="w-5 h-5" /></button>
            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
                {[
                  {k: 'title', l: 'Title'}, 
                  {k: 'author', l: 'Author'}, 
                  {k: 'publisher', l: 'Publisher'}, 
                  {k: 'year', l: 'Year'}, 
                  {k: 'category', l: 'Category'}, 
                  {k: 'topic', l: 'Topic'}, 
                  {k: 'subTopic', l: 'Sub Topic'}, 
                  {k: 'createdAt', l: 'Created At'}
                ].map((item) => (
                  <button key={item.k} onClick={() => { handleSort(item.k as keyof LibraryItem); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === item.k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <span>{item.l}</span>
                    {sortConfig.key === item.k && (sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-3 h-3 stroke-[3]" /> : <ChevronDownIcon className="w-3 h-3 stroke-[3]" />)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete}><TrashIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="primary" onClick={() => handleBatchAction('isBookmarked')}><BookmarkIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')}><StarIcon className="w-5 h-5" /></StandardQuickActionButton>
      </StandardQuickAccessBar>

      {/* Select All Button for Mobile */}
      {isMobile && paginatedItems.length > 0 && (
        <div className="lg:hidden shrink-0 mt-2">
          <button 
            onClick={toggleSelectAll}
            className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${selectedIds.length === paginatedItems.length ? 'bg-[#004A74] border-[#004A74] text-white' : 'bg-white border-gray-100 text-[#004A74]'}`}
          >
            {selectedIds.length === paginatedItems.length ? <CheckCircleSolid className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{selectedIds.length === paginatedItems.length ? 'DESELECT' : 'SELECT ALL'}</span>
          </button>
        </div>
      )}

      {/* Table View (Desktop) */}
      <div className="hidden lg:flex flex-col flex-none">
        <StandardTableContainer>
          <StandardTableWrapper>
            <thead className="sticky top-0 z-[50]">
              <tr>
                {/* Checkbox Header: Frozen at left-0 */}
                <th className="sticky left-0 z-[60] px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                  <div className="flex items-center justify-center">
                    <StandardCheckbox onChange={toggleSelectAll} checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length} />
                  </div>
                </th>
                {tableColumns.map(col => (
                  <StandardTh 
                    key={col.key} 
                    onClick={() => handleSort(col.key)} 
                    isActiveSort={sortConfig.key === col.key}
                    width={col.width}
                    className={col.key === 'title' ? 'sticky left-12 z-[55] border-r border-gray-100/50 shadow-sm' : ''}
                  >
                    {col.label} {getSortIcon(col.key)}
                  </StandardTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.length === 0 ? (
                <tr><td colSpan={tableColumns.length + 1} className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center space-y-2"><div className="p-4 bg-gray-50 rounded-full"><PlusIcon className="w-8 h-8 text-gray-300" /></div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Collection Found</p></div></td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <StandardTr key={item.id} className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                    {/* Checkbox Cell: Frozen at left-0 */}
                    <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={(e) => e.stopPropagation()}>
                      <StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
                    </td>
                    {/* Title Cell: Frozen at left-12 */}
                    <StandardTd isActiveSort={sortConfig.key === 'title'} className="sticky left-12 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm">
                      <div className="flex items-start gap-2 group/title">
                        <div className="shrink-0 mt-0.5 transition-transform group-hover/title:scale-110">
                          {item.addMethod === 'FILE' ? (
                            <DocumentIcon className="w-4 h-4 text-[#004A74]" />
                          ) : (
                            <LinkIcon className="w-4 h-4 text-[#560D96]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-[#004A74] line-clamp-2 group-hover/title:underline leading-snug transition-all">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}
                              {item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}
                            </div>
                          </div>
                        </div>
                        <EyeIcon className="w-3.5 h-3.5 text-gray-300 group-hover/title:text-[#004A74] opacity-0 group-hover/title:opacity-100 transition-all shrink-0 mt-1" />
                      </div>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'author'} className="text-xs text-gray-600 italic text-center">
                      <div className="line-clamp-2">{item.author || '-'}</div>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'publisher'} className="text-xs text-gray-600 text-center">
                      <div className="line-clamp-2">{item.publisher || '-'}</div>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'year'} className="text-xs text-gray-600 font-mono text-center">{item.year || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'category'} className="text-xs text-gray-600 text-center">{item.category || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'topic'} className="text-xs text-gray-600 text-center">{item.topic || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'subTopic'} className="text-xs text-gray-600 text-center">{item.subTopic || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'createdAt'} className="text-xs font-medium text-gray-400 whitespace-nowrap text-center">{formatDateTime(item.createdAt)}</StandardTd>
                  </StandardTr>
                ))
              )}
            </tbody>
          </StandardTableWrapper>
          <StandardTableFooter totalItems={filteredAndSortedItems.length} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </StandardTableContainer>
      </div>

      {/* Grid View (Mobile/Tablet) */}
      <div className="lg:hidden flex-none pb-10">
        <StandardGridContainer>
          {paginatedItems.map((item) => (
            <StandardItemCard 
              key={item.id} 
              isSelected={selectedIds.includes(item.id)} 
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => toggleSelectItem(item.id)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'bg-white border-gray-200'}`}
                >
                  {selectedIds.includes(item.id) && <CheckIcon className="w-3 h-3 stroke-[4]" />}
                </button>
                <span className="text-[8px] font-black uppercase tracking-widest bg-[#004A74] text-white px-2 py-0.5 rounded-full">
                  {item.category || 'GENERAL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#004A74] opacity-80">
                  {item.topic || 'NO TOPIC'}
                </span>
              </div>
              <div className="mt-[-4px] mb-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                  {item.subTopic || 'No Sub Topic'}
                </span>
              </div>
              <div className="flex items-start gap-2 mb-3">
                <div className="shrink-0 mt-1">
                  {item.addMethod === 'FILE' ? (
                    <DocumentIcon className="w-3.5 h-3.5 text-[#004A74]" />
                  ) : (
                    <LinkIcon className="w-3.5 h-3.5 text-[#560D96]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#004A74] line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                </div>
                <div className="flex gap-1 shrink-0 mt-1">
                  {item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}
                  {item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 italic line-clamp-2 mb-1">
                {item.author || 'Unknown Author'}
              </p>
              <p className="text-[11px] text-gray-400 truncate mb-4">
                {item.publisher || '-'}
              </p>
              <div className="h-px bg-gray-50 mb-3" />
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-mono font-black text-[#004A74]">
                  {item.year || '-'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-tight">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
            </StandardItemCard>
          ))}
        </StandardGridContainer>
        {totalPages > 1 && <div className="pt-8"><StandardTableFooter totalItems={filteredAndSortedItems.length} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
      </div>
    </div>
  );
};

export default LibraryMain;
