import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SourceType, FileFormat, LibraryItem, LibraryType } from '../../types';
import { saveLibraryItem, uploadAndStoreFile } from '../../services/gasService';
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
  const [extractionStage, setExtractionStage] = useState<'IDLE' | 'READING' | 'AI_ANALYSIS'>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  
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
    // Academic Citations
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 25 * 1024 * 1024) {
        showXeenapsAlert({ 
          icon: 'error', 
          title: 'File Too Large', 
          text: 'Maximum allowed file size for Xeenaps is 25MB.', 
          confirmButtonText: 'OK' 
        });
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setExtractionStage('READING');
      try {
        const result = await uploadAndStoreFile(selectedFile);
        if (result) {
          const processedChunks = result.chunks || [];
          setExtractionStage('AI_ANALYSIS');
          
          // AI tetap digunakan hanya untuk analisa metadata awal
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
            fileId: result.fileId || prev.fileId,
            inTextAPA: aiMeta.inTextAPA || '',
            inTextHarvard: aiMeta.inTextHarvard || '',
            inTextChicago: aiMeta.inTextChicago || '',
            bibAPA: aiMeta.bibAPA || '',
            bibHarvard: aiMeta.bibHarvard || '',
            bibChicago: aiMeta.bibChicago || '',
            chunks: processedChunks 
          }));
        }
      } catch (err: any) {
        console.error("Extraction workflow failed:", err);
        showXeenapsAlert({ 
          icon: 'warning', 
          title: 'Extraction Notice', 
          text: err.message || 'Automatic metadata extraction failed. You can still fill it manually.', 
          confirmButtonText: 'OK' 
        });
      } finally {
        setExtractionStage('IDLE');
      }
    }
  };

  const validate = () => {
    const hasSource = formData.addMethod === 'LINK' ? !!formData.url : !!file;
    return hasSource && !!formData.type && !!formData.category && !!formData.topic;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showXeenapsAlert({ icon: 'error', title: 'INCOMPLETE DATA', text: 'Please fill in all required fields.', confirmButtonText: 'OK' });
      return;
    }

    setIsSubmitting(true);
    
    let detectedFormat = FileFormat.PDF;
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'pptx': detectedFormat = FileFormat.PPTX; break;
        case 'ppt': detectedFormat = FileFormat.PPT; break;
        case 'docx': detectedFormat = FileFormat.DOCX; break;
        case 'doc': detectedFormat = FileFormat.DOC; break;
        case 'xlsx': detectedFormat = FileFormat.XLSX; break;
        case 'xls': detectedFormat = FileFormat.XLS; break;
        case 'csv': detectedFormat = FileFormat.CSV; break;
        case 'txt': detectedFormat = FileFormat.TXT; break;
        case 'md': detectedFormat = FileFormat.MD; break;
        case 'epub': detectedFormat = FileFormat.EPUB; break;
        case 'jpg': case 'jpeg': case 'png': case 'gif': detectedFormat = FileFormat.PDF; break; // Gambar diproses sebagai konten dokumen
        default: detectedFormat = FileFormat.PDF;
      }
    }

    const newItem: LibraryItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: formData.title || 'Untitled Reference',
      type: formData.type,
      category: formData.category,
      topic: formData.topic,
      subTopic: formData.subTopic,
      author: formData.authors.join(', '),
      authors: formData.authors,
      publisher: formData.publisher,
      year: formData.year,
      addMethod: formData.addMethod,
      source: formData.addMethod === 'LINK' ? SourceType.LINK : SourceType.FILE,
      format: formData.addMethod === 'LINK' ? FileFormat.URL : detectedFormat,
      url: formData.addMethod === 'LINK' ? formData.url : '',
      fileId: formData.addMethod === 'FILE' ? formData.fileId : '',
      keywords: formData.keywords,
      labels: formData.labels,
      tags: [...formData.keywords, ...formData.labels],
      inTextAPA: formData.inTextAPA,
      inTextHarvard: formData.inTextHarvard,
      inTextChicago: formData.inTextChicago,
      bibAPA: formData.bibAPA,
      bibHarvard: formData.bibHarvard,
      bibChicago: formData.bibChicago,
      researchMethodology: '',
      abstract: '',
      summary: '',
      strength: '',
      weakness: '',
      unfamiliarTerminology: '',
      supportingReferences: '',
      videoRecommendation: '',
      quickTipsForYou: '',
      extractedInfo1: formData.chunks[0] || '',
      extractedInfo2: formData.chunks[1] || '',
      extractedInfo3: formData.chunks[2] || '',
      extractedInfo4: formData.chunks[3] || '',
      extractedInfo5: formData.chunks[4] || '',
      extractedInfo6: formData.chunks[5] || '',
      extractedInfo7: formData.chunks[6] || '',
      extractedInfo8: formData.chunks[7] || '',
      extractedInfo9: formData.chunks[8] || '',
      extractedInfo10: formData.chunks[9] || '',
    };

    const success = await saveLibraryItem(newItem);
    if (success) {
      onComplete();
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const isExtracting = extractionStage !== 'IDLE';

  const HeaderSelector = (
    <div className="flex items-center justify-center md:justify-end bg-gray-100/50 p-1.5 rounded-2xl gap-1 shrink-0 w-full md:w-auto">
      <button type="button" onClick={() => setFormData({...formData, addMethod: 'LINK'})} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${formData.addMethod === 'LINK' ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}><LinkIcon className="w-4 h-4" /> LINK</button>
      <button type="button" onClick={() => setFormData({...formData, addMethod: 'FILE'})} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${formData.addMethod === 'FILE' ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}><DocumentIcon className="w-4 h-4" /> FILE</button>
    </div>
  );

  return (
    <FormPageContainer>
      <FormStickyHeader title="Add Collection" subtitle="Expand your digital library" onBack={() => navigate('/')} rightElement={HeaderSelector} />
      <FormContentArea>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="animate-in slide-in-from-top-4 duration-500">
            {formData.addMethod === 'LINK' ? (
              <FormField label="Reference URL" required error={!formData.url}>
                <div className="relative group">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#004A74] transition-colors" />
                  <input className={`w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#004A74]/10 focus:border-[#004A74] outline-none border ${!formData.url ? 'border-red-300' : 'border-gray-200'} shadow-sm text-sm font-medium transition-all`} placeholder="Paste research link, PDF URL, or web page here..." value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
                </div>
              </FormField>
            ) : (
              <FormField label="File Attachment" required error={!file}>
                <label className={`relative flex flex-col items-center justify-center w-full h-40 bg-gray-50 border-2 border-dashed ${!file ? 'border-red-300' : 'border-gray-200'} rounded-[2rem] cursor-pointer hover:bg-gray-100 hover:border-[#004A74]/40 transition-all group outline-none focus:ring-2 focus:ring-[#004A74]/10 overflow-hidden`}>
                  {isExtracting ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <ArrowPathIcon className={`w-10 h-10 text-[#004A74] animate-spin mb-3 ${extractionStage === 'AI_ANALYSIS' ? 'opacity-20' : ''}`} />
                        {extractionStage === 'AI_ANALYSIS' && <SparklesIcon className="w-8 h-8 text-[#FED400] absolute top-1 left-1 animate-pulse" />}
                      </div>
                      <p className="text-sm font-black text-[#004A74] tracking-widest uppercase">{extractionStage === 'READING' ? 'Reading Content...' : 'AI Metadata Analysis...'}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Please wait while we scan your document</p>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className={`w-8 h-8 ${!file ? 'text-red-300' : 'text-gray-300'} group-hover:text-[#004A74] mb-2 transition-colors`} />
                      <p className="text-sm text-gray-500 group-hover:text-[#004A74] px-6 text-center">{file ? <span className="font-bold text-[#004A74]">{file.name}</span> : "Drop PDF, Word, PPT, Excel or Image here (Max 25Mb)"}</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.epub,.jpg,.jpeg,.png" 
                    disabled={isExtracting} 
                  />
                </label>
              </FormField>
            )}
          </div>
          <div className="h-px bg-gray-50" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Type" required error={!formData.type}><FormDropdown value={formData.type} onChange={(v) => setFormData({...formData, type: v as LibraryType})} options={Object.values(LibraryType)} placeholder="Select type..." error={!formData.type} /></FormField>
            <FormField label="Category" required error={!formData.category}><FormDropdown value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={['Original Research', 'Review', 'Case Study', 'Technical Report', 'Other']} placeholder="Select category..." error={!formData.category} /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Topic" required error={!formData.topic}><FormDropdown value={formData.topic} onChange={(v) => setFormData({...formData, topic: v})} options={existingValues.topics} placeholder="Scientific topic..." error={!formData.topic} /></FormField>
            <FormField label="Sub Topic"><FormDropdown value={formData.subTopic} onChange={(v) => setFormData({...formData, subTopic: v})} options={existingValues.subTopics} placeholder="Specific area..." /></FormField>
          </div>
          <FormField label="Title"><input className={`w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-[#004A74]/10 outline-none border border-gray-200 focus:border-[#004A74] shadow-sm text-sm font-bold text-[#004A74] transition-all ${isExtracting ? 'opacity-50' : ''}`} placeholder="Enter title..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isExtracting} /></FormField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2"><FormField label="Author(s)"><FormDropdown isMulti multiValues={formData.authors} onAddMulti={(v) => setFormData({...formData, authors: [...formData.authors, v]})} onRemoveMulti={(v) => setFormData({...formData, authors: formData.authors.filter(a => a !== v)})} options={existingValues.allAuthors} placeholder="Identify authors..." value="" onChange={() => {}} /></FormField></div>
            <FormField label="Year"><input type="text" className={`w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#004A74]/10 border border-gray-200 focus:border-[#004A74] text-sm font-mono font-bold transition-all ${isExtracting ? 'opacity-50' : ''}`} placeholder="YYYY" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value.substring(0,4)})} disabled={isExtracting} /></FormField>
          </div>
          <FormField label="Publisher / Journal"><FormDropdown value={formData.publisher} onChange={(v) => setFormData({...formData, publisher: v})} options={existingValues.publishers} placeholder="Journal name..." /></FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Keywords"><FormDropdown isMulti multiValues={formData.keywords} onAddMulti={(v) => setFormData({...formData, keywords: [...formData.keywords, v]})} onRemoveMulti={(v) => setFormData({...formData, keywords: formData.keywords.filter(a => a !== v)})} options={existingValues.allKeywords} placeholder="Keywords..." value="" onChange={() => {}} /></FormField>
            <FormField label="Labels"><FormDropdown isMulti multiValues={formData.labels} onAddMulti={(v) => setFormData({...formData, labels: [...formData.labels, v]})} onRemoveMulti={(v) => setFormData({...formData, labels: formData.labels.filter(a => a !== v)})} options={existingValues.allLabels} placeholder="Thematic labels..." value="" onChange={() => {}} /></FormField>
          </div>
          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button type="button" onClick={() => navigate('/')} className="w-full md:px-10 py-5 bg-gray-100 text-gray-400 rounded-[1.5rem] font-black text-sm hover:bg-gray-200 transition-all uppercase tracking-widest active:scale-95">Cancel</button>
            <button type="submit" disabled={isSubmitting || isExtracting} className="w-full py-5 bg-[#004A74] text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 hover:shadow-2xl hover:bg-[#003859] transition-all disabled:opacity-50 transform active:scale-[0.98] tracking-widest uppercase">{isSubmitting ? 'SYNCING...' : isExtracting ? 'ANALYZING...' : <><CheckIcon className="w-5 h-5" /> Register Item</>}</button>
          </div>
        </form>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default LibraryForm;