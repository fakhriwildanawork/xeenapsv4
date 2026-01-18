
import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SourceType, FileFormat, LibraryItem, LibraryType } from '../../types';
import { saveLibraryItem, uploadAndStoreFile, extractFromUrl } from '../../services/gasService';
import { extractMetadataWithAI } from '../../services/AddCollectionService';
import { 
  CheckIcon, 
  LinkIcon, 
  DocumentIcon, 
  CloudArrowUpIcon, 
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { showXeenapsAlert } from '../../utils/swalUtils';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';

interface LibraryFormProps {
  onComplete: () => void;
  items: LibraryItem[];
}

const LibraryForm: React.FC<LibraryFormProps> = ({ onComplete, items = [] }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionStage, setExtractionStage] = useState<'IDLE' | 'READING' | 'BYPASS' | 'AI_ANALYSIS'>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  const lastExtractedUrl = useRef<string>("");
  
  const [formData, setFormData] = useState({
    addMethod: 'LINK' as 'LINK' | 'FILE',
    type: LibraryType.LITERATURE, 
    category: 'Original Research',
    topic: '',
    subTopic: '',
    title: '',
    authors: [] as string[],
    publisher: '',
    year: '',
    keywords: [] as string[],
    labels: [] as string[],
    url: '',
    fileId: '',
    inTextAPA: '',
    inTextHarvard: '',
    inTextChicago: '',
    bibAPA: '',
    bibHarvard: '',
    bibChicago: '',
    chunks: [] as string[]
  });

  const existingValues = useMemo(() => ({
    topics: Array.from(new Set(items.map(i => i.topic).filter(Boolean))),
    subTopics: Array.from(new Set(items.map(i => i.subTopic).filter(Boolean))),
    publishers: Array.from(new Set(items.map(i => i.publisher).filter(Boolean))),
    allAuthors: Array.from(new Set(items.flatMap(i => i.authors || []).filter(Boolean))),
    allKeywords: Array.from(new Set(items.flatMap(i => i.keywords || []).filter(Boolean))),
    allLabels: Array.from(new Set(items.flatMap(i => i.labels || []).filter(Boolean))),
  }), [items]);

  useEffect(() => {
    const handleUrlExtraction = async () => {
      const url = formData.url.trim();
      if (url && url.startsWith('http') && url !== lastExtractedUrl.current && formData.addMethod === 'LINK') {
        lastExtractedUrl.current = url;
        setExtractionStage('READING');
        try {
          const result = await extractFromUrl(url, (stage) => setExtractionStage(stage));
          if (result) {
            setExtractionStage('AI_ANALYSIS');
            const aiMeta = await extractMetadataWithAI(result.aiSnippet || result.fullText || "");
            setFormData(prev => ({
              ...prev,
              title: aiMeta.title || result.title || prev.title,
              year: aiMeta.year || result.year || prev.year,
              publisher: aiMeta.publisher || result.publisher || prev.publisher,
              authors: (aiMeta.authors && aiMeta.authors.length > 0) ? aiMeta.authors : (result.authors || prev.authors),
              keywords: (aiMeta.keywords && aiMeta.keywords.length > 0) ? aiMeta.keywords : (result.keywords || prev.keywords),
              labels: (aiMeta.labels && aiMeta.labels.length > 0) ? aiMeta.labels : prev.labels,
              type: (aiMeta.type as LibraryType) || (result.type as LibraryType) || prev.type,
              category: aiMeta.category || result.category || prev.category,
              topic: aiMeta.topic || prev.topic,
              subTopic: aiMeta.subTopic || prev.subTopic,
              inTextAPA: aiMeta.inTextAPA || '',
              inTextHarvard: aiMeta.inTextHarvard || '',
              inTextChicago: aiMeta.inTextChicago || '',
              bibAPA: aiMeta.bibAPA || '',
              bibHarvard: aiMeta.bibHarvard || '',
              bibChicago: aiMeta.bibChicago || '',
              chunks: result.chunks || []
            }));
          }
        } catch (err: any) {
          // REQUESTED FINAL WARNING MODAL
          showXeenapsAlert({ 
            icon: 'warning', 
            title: 'EXTRACTION FAILED', 
            text: 'This link can not be extracted, you can not use Insight Analyzer for this link and you are must be responsible for the content', 
            confirmButtonText: 'I UNDERSTAND' 
          });
          // Clear chunks to prevent insight analyzer later
          setFormData(prev => ({ ...prev, chunks: [] }));
        } finally {
          setExtractionStage('IDLE');
        }
      }
    };
    const tid = setTimeout(handleUrlExtraction, 1000);
    return () => clearTimeout(tid);
  }, [formData.url, formData.addMethod]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractionStage('READING');
      try {
        const result = await uploadAndStoreFile(selectedFile);
        if (result) {
          setExtractionStage('AI_ANALYSIS');
          const aiMeta = await extractMetadataWithAI(result.aiSnippet || result.fullText || "");
          setFormData(prev => ({
            ...prev,
            title: aiMeta.title || result.title || prev.title,
            year: aiMeta.year || result.year || prev.year,
            publisher: aiMeta.publisher || result.publisher || prev.publisher,
            authors: (aiMeta.authors && aiMeta.authors.length > 0) ? aiMeta.authors : (result.authors || prev.authors),
            keywords: (aiMeta.keywords && aiMeta.keywords.length > 0) ? aiMeta.keywords : (result.keywords || prev.keywords),
            labels: (aiMeta.labels && aiMeta.labels.length > 0) ? aiMeta.labels : prev.labels,
            type: (aiMeta.type as LibraryType) || (result.type as LibraryType) || prev.type,
            category: aiMeta.category || result.category || prev.category,
            topic: aiMeta.topic || prev.topic,
            subTopic: aiMeta.subTopic || prev.subTopic,
            inTextAPA: aiMeta.inTextAPA || '',
            inTextHarvard: aiMeta.inTextHarvard || '',
            inTextChicago: aiMeta.inTextChicago || '',
            bibAPA: aiMeta.bibAPA || '',
            bibHarvard: aiMeta.bibHarvard || '',
            bibChicago: aiMeta.bibChicago || '',
            chunks: result.chunks || []
          }));
        }
      } catch (err: any) {
        showXeenapsAlert({ icon: 'warning', title: 'File Error', text: err.message || 'Extraction failed.', confirmButtonText: 'OK' });
      } finally {
        setExtractionStage('IDLE');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let detectedFormat = FileFormat.PDF;
    let fileUploadData = undefined;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const formatMap: any = { 'pptx': FileFormat.PPTX, 'docx': FileFormat.DOCX, 'xlsx': FileFormat.XLSX };
      detectedFormat = formatMap[ext || ''] || FileFormat.PDF;
      const reader = new FileReader();
      const b64 = await new Promise<string>(r => { reader.onload = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
      fileUploadData = { fileName: file.name, mimeType: file.type, fileData: b64 };
    }
    const newItem: any = { ...formData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: formData.addMethod === 'LINK' ? SourceType.LINK : SourceType.FILE, format: formData.addMethod === 'LINK' ? FileFormat.URL : detectedFormat, author: formData.authors.join(', '), tags: [...formData.keywords, ...formData.labels], extractedInfo1: formData.chunks[0] || '', extractedInfo2: formData.chunks[1] || '' };
    const success = await saveLibraryItem(newItem, fileUploadData);
    if (success) { onComplete(); navigate('/'); }
    setIsSubmitting(false);
  };

  const isExtracting = extractionStage !== 'IDLE';

  return (
    <FormPageContainer>
      <FormStickyHeader title="Add Collection" subtitle="Expand your digital library" onBack={() => navigate('/')} rightElement={
        <div className="flex bg-gray-100/50 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
          <button type="button" onClick={() => setFormData({...formData, addMethod: 'LINK'})} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${formData.addMethod === 'LINK' ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}><LinkIcon className="w-4 h-4" /> LINK</button>
          <button type="button" onClick={() => setFormData({...formData, addMethod: 'FILE'})} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${formData.addMethod === 'FILE' ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}><DocumentIcon className="w-4 h-4" /> FILE</button>
        </div>
      } />
      <FormContentArea>
        <form onSubmit={handleSubmit} className="space-y-8">
          {formData.addMethod === 'LINK' ? (
            <FormField label="Reference URL" required error={!formData.url}>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
                  {isExtracting ? <ArrowPathIcon className="w-5 h-5 text-[#004A74] animate-spin" /> : <LinkIcon className="w-5 h-5 text-gray-300 group-focus-within:text-[#004A74]" />}
                </div>
                <input className={`w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 border ${!formData.url ? 'border-red-300' : 'border-gray-200'} text-sm font-medium transition-all ${isExtracting ? 'opacity-80' : ''}`} placeholder="Paste research link..." value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} disabled={isExtracting} />
                {isExtracting && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-[#FED400] animate-pulse" />
                    <span className="text-[10px] font-black text-[#004A74] uppercase tracking-tighter">
                      {extractionStage === 'READING' ? 'Fetching...' : extractionStage === 'BYPASS' ? 'Bypassing Protection...' : 'AI Metadata Analysis...'}
                    </span>
                  </div>
                )}
              </div>
            </FormField>
          ) : (
            <FormField label="File Attachment" required error={!file}>
              <label className={`relative flex flex-col items-center justify-center w-full h-40 bg-gray-50 border-2 border-dashed ${!file ? 'border-red-300' : 'border-gray-200'} rounded-[2rem] cursor-pointer group`}>
                {isExtracting ? (
                  <div className="flex flex-col items-center">
                    <ArrowPathIcon className="w-10 h-10 text-[#004A74] animate-spin mb-3" />
                    <p className="text-sm font-black text-[#004A74] uppercase tracking-widest">{extractionStage === 'READING' ? 'Reading Content...' : 'AI Metadata Analysis...'}</p>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-8 h-8 text-gray-300 group-hover:text-[#004A74] mb-2" />
                    <p className="text-sm text-gray-500 text-center px-6">{file ? <span className="font-bold text-[#004A74]">{file.name}</span> : "Drop PDF, Word, or Excel here (Max 25Mb)"}</p>
                  </>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} disabled={isExtracting} />
              </label>
            </FormField>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Type" required error={!formData.type}><FormDropdown value={formData.type} onChange={(v) => setFormData({...formData, type: v as LibraryType})} options={Object.values(LibraryType)} placeholder="Select type..." /></FormField>
            <FormField label="Category" required error={!formData.category}><FormDropdown value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={['Original Research', 'Review', 'Case Study', 'Technical Report', 'Other']} placeholder="Select category..." /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Topic" required error={!formData.topic}><FormDropdown value={formData.topic} onChange={(v) => setFormData({...formData, topic: v})} options={existingValues.topics} placeholder="Scientific topic..." /></FormField>
            <FormField label="Sub Topic"><FormDropdown value={formData.subTopic} onChange={(v) => setFormData({...formData, subTopic: v})} options={existingValues.subTopics} placeholder="Specific area..." /></FormField>
          </div>
          <FormField label="Title"><input className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#004A74]" placeholder="Enter title..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isExtracting} /></FormField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2"><FormField label="Author(s)"><FormDropdown isMulti multiValues={formData.authors} onAddMulti={(v) => setFormData({...formData, authors: [...formData.authors, v]})} onRemoveMulti={(v) => setFormData({...formData, authors: formData.authors.filter(a => a !== v)})} options={existingValues.allAuthors} placeholder="Identify authors..." value="" onChange={() => {}} /></FormField></div>
            <FormField label="Year"><input type="text" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono font-bold" placeholder="YYYY" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value.substring(0,4)})} disabled={isExtracting} /></FormField>
          </div>
          <FormField label="Publisher / Journal"><FormDropdown value={formData.publisher} onChange={(v) => setFormData({...formData, publisher: v})} options={existingValues.publishers} placeholder="Journal name..." /></FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Keywords"><FormDropdown isMulti multiValues={formData.keywords} onAddMulti={(v) => setFormData({...formData, keywords: [...formData.keywords, v]})} onRemoveMulti={(v) => setFormData({...formData, keywords: formData.keywords.filter(a => a !== v)})} options={existingValues.allKeywords} placeholder="Keywords..." value="" onChange={() => {}} /></FormField>
            <FormField label="Labels"><FormDropdown isMulti multiValues={formData.labels} onAddMulti={(v) => setFormData({...formData, labels: [...formData.labels, v]})} onRemoveMulti={(v) => setFormData({...formData, labels: formData.labels.filter(a => a !== v)})} options={existingValues.allLabels} placeholder="Thematic labels..." value="" onChange={() => {}} /></FormField>
          </div>
          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button type="button" onClick={() => navigate('/')} className="w-full md:px-10 py-5 bg-gray-100 text-gray-400 rounded-[1.5rem] font-black text-sm uppercase">Cancel</button>
            <button type="submit" disabled={isSubmitting || isExtracting} className="w-full py-5 bg-[#004A74] text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 uppercase">{isSubmitting ? 'SYNCING...' : isExtracting ? 'ANALYZING...' : <><CheckIcon className="w-5 h-5" /> Register Item</>}</button>
          </div>
        </form>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default LibraryForm;
