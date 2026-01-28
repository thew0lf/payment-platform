'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  LandingPageDetail,
  SectionDetail,
  SectionType,
  getLandingPage,
  updateLandingPage,
  addSection as apiAddSection,
  updateSection as apiUpdateSection,
  deleteSection as apiDeleteSection,
  reorderSections as apiReorderSections,
  deployLandingPage,
  UpdateLandingPageInput,
  CreateSectionInput,
} from '@/lib/api/landing-pages';
import { EditorContextValue, EditorMode, DevicePreview } from './types';
import { getDefaultContent } from './utils';
import { useHierarchy } from '@/contexts/hierarchy-context';

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

interface EditorProviderProps {
  children: ReactNode;
  initialPage: LandingPageDetail;
  pageId: string;
  onPageUpdate?: (page: LandingPageDetail) => void;
}

export function EditorProvider({ children, initialPage, pageId, onPageUpdate }: EditorProviderProps) {
  const { selectedCompanyId } = useHierarchy();
  const [page, setPage] = useState<LandingPageDetail>(initialPage);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const updatePageState = useCallback((newPage: LandingPageDetail) => {
    setPage(newPage);
    onPageUpdate?.(newPage);
  }, [onPageUpdate]);

  const updateSection = useCallback(async (sectionId: string, data: Partial<SectionDetail>) => {
    try {
      const updated = await apiUpdateSection(pageId, sectionId, data);
      updatePageState(updated);
    } catch (err: any) {
      console.error('Failed to update section:', err);
      toast.error(err.message || 'Failed to update section');
    }
  }, [pageId, updatePageState]);

  const addSection = useCallback(async (type: SectionType, afterSectionId?: string) => {
    try {
      const defaultContent = getDefaultContent(type);
      let order = page.sections.length;

      if (afterSectionId) {
        const afterIndex = page.sections.findIndex(s => s.id === afterSectionId);
        if (afterIndex !== -1) {
          order = afterIndex + 1;
        }
      }

      const input: CreateSectionInput = {
        type,
        order,
        content: defaultContent,
        enabled: true,
      };
      const updated = await apiAddSection(pageId, input);
      updatePageState(updated);

      // Select the newly added section
      const newSection = updated.sections.find(s => s.order === order);
      if (newSection) {
        setSelectedSectionId(newSection.id);
      }

      toast.success(`${type.replace('_', ' ')} section added`);
    } catch (err: any) {
      console.error('Failed to add section:', err);
      toast.error(err.message || 'Failed to add section');
    }
  }, [pageId, page.sections, updatePageState]);

  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      const updated = await apiDeleteSection(pageId, sectionId);
      updatePageState(updated);

      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }

      toast.success('Section deleted');
    } catch (err: any) {
      console.error('Failed to delete section:', err);
      toast.error(err.message || 'Failed to delete section');
    }
  }, [pageId, selectedSectionId, updatePageState]);

  const moveSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = page.sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= page.sections.length) return;

    const newOrder = [...page.sections];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    try {
      const updated = await apiReorderSections(pageId, newOrder.map(s => s.id));
      updatePageState(updated);
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      toast.error('Failed to reorder sections');
    }
  }, [pageId, page.sections, updatePageState]);

  const reorderSections = useCallback(async (sectionIds: string[]) => {
    try {
      const updated = await apiReorderSections(pageId, sectionIds);
      updatePageState(updated);
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      toast.error('Failed to reorder sections');
    }
  }, [pageId, updatePageState]);

  const updatePage = useCallback((data: Partial<LandingPageDetail>) => {
    setPage(prev => ({ ...prev, ...data }));
    setHasChanges(true);
  }, []);

  const savePage = useCallback(async () => {
    setSaving(true);
    try {
      const updateData: UpdateLandingPageInput = {
        name: page.name,
        slug: page.slug,
        theme: page.theme,
        colorScheme: page.colorScheme,
        typography: page.typography,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        customCss: page.customCss,
        customJs: page.customJs,
        googleAnalyticsId: page.googleAnalyticsId,
        facebookPixelId: page.facebookPixelId,
      };
      const updated = await updateLandingPage(pageId, updateData, selectedCompanyId || undefined);
      updatePageState(updated);
      setHasChanges(false);
      toast.success('Page saved');
    } catch (err: any) {
      console.error('Failed to save:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [pageId, page, updatePageState, selectedCompanyId]);

  const deployPage = useCallback(async () => {
    setDeploying(true);
    try {
      // Import the generatePreviewHtml function
      const { generatePreviewHtml } = await import('./preview-renderer');
      const html = generatePreviewHtml(page);
      const result = await deployLandingPage(pageId, html);

      if (result.success) {
        toast.success(`Deployed successfully!`, {
          description: result.url,
          action: {
            label: 'Open',
            onClick: () => window.open(result.url, '_blank'),
          },
        });
        // Reload page data to get updated status
        const updated = await getLandingPage(pageId);
        updatePageState(updated);
      }
    } catch (err: any) {
      console.error('Failed to deploy:', err);
      toast.error(err.message || 'Failed to deploy');
    } finally {
      setDeploying(false);
    }
  }, [pageId, page, updatePageState]);

  const value: EditorContextValue = {
    page,
    selectedSectionId,
    setSelectedSectionId,
    editorMode,
    setEditorMode,
    devicePreview,
    setDevicePreview,
    updateSection,
    addSection,
    deleteSection,
    moveSection,
    reorderSections,
    updatePage,
    savePage,
    deployPage,
    hasChanges,
    saving,
    deploying,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
