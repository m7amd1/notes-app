"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Download,
  Bold,
  Italic,
  Search,
  FileText,
  Edit3,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const { toast } = useToast();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load notes from localStorage on component mount
  useEffect(() => {
    if (!isMounted) return;

    const loadNotes = async () => {
      setIsLoading(true);
      // Simulate loading time for better UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        const savedNotes = localStorage.getItem("notes");
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          }));
          setNotes(parsedNotes);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        toast({
          title: "Error loading notes",
          description: "There was a problem loading your saved notes.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };
    loadNotes();
  }, [isMounted, toast]);

  // Debounced save function
  const debouncedSave = useCallback(
    (notesToSave: Note[]) => {
      if (!isMounted) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem("notes", JSON.stringify(notesToSave));
          setIsSaving(false);
        } catch (error) {
          console.error("Error saving notes:", error);
          setIsSaving(false);
          toast({
            title: "Error saving notes",
            description: "There was a problem saving your notes.",
            variant: "destructive",
          });
        }
      }, 500);
    },
    [isMounted, toast]
  );

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (!isLoading && notes.length >= 0 && isMounted) {
      debouncedSave(notes);
    }
  }, [notes, isLoading, isMounted, debouncedSave]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setTimeout(() => titleRef.current?.focus(), 100);

    toast({
      title: "New note created",
      description: "Start typing to add content to your note.",
    });
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      )
    );
    if (selectedNote?.id === id) {
      setSelectedNote((prev) =>
        prev ? { ...prev, ...updates, updatedAt: new Date() } : null
      );
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setIsEditing(false);
    }
    toast({
      title: "Note deleted",
      description: "The note has been successfully deleted.",
    });
  };

  const togglePin = (id: string) => {
    const note = notes.find((n) => n.id === id);
    updateNote(id, { isPinned: !note?.isPinned });
    toast({
      title: note?.isPinned ? "Note unpinned" : "Note pinned",
      description: note?.isPinned
        ? "Note removed from pinned notes."
        : "Note pinned to top.",
    });
  };

  const handleTitleChange = (value: string) => {
    if (selectedNote) {
      updateNote(selectedNote.id, { title: value || "Untitled Note" });
    }
  };

  const handleContentChange = () => {
    if (selectedNote && editorRef.current) {
      updateNote(selectedNote.id, { content: editorRef.current.innerHTML });
    }
  };

  const formatText = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    handleContentChange();
  };

  const downloadAsPDF = async () => {
    if (!selectedNote) return;

    setIsExporting(true);
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF();

      // Add title
      pdf.setFontSize(20);
      pdf.text(selectedNote.title, 20, 30);

      // Add content (strip HTML tags for PDF)
      const textContent = selectedNote.content.replace(/<[^>]*>/g, "");
      pdf.setFontSize(12);
      const splitText = pdf.splitTextToSize(textContent, 170);
      pdf.text(splitText, 20, 50);

      // Add metadata
      pdf.setFontSize(10);
      pdf.text(
        `Created: ${selectedNote.createdAt.toLocaleDateString()}`,
        20,
        pdf.internal.pageSize.height - 20
      );
      pdf.text(
        `Updated: ${selectedNote.updatedAt.toLocaleDateString()}`,
        20,
        pdf.internal.pageSize.height - 10
      );

      pdf.save(`${selectedNote.title}.pdf`);

      toast({
        title: "PDF downloaded",
        description: "Your note has been exported as a PDF file.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your note to PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault();
            createNewNote();
            break;
          case "f":
            e.preventDefault();
            const searchInput = document.querySelector(
              'input[placeholder*="Search"]'
            ) as HTMLInputElement;
            searchInput?.focus();
            break;
          case "s":
            e.preventDefault();
            // Save is automatic, just show feedback
            toast({
              title: "Auto-saved",
              description: "Your notes are automatically saved.",
            });
            break;
        }
      }

      if (e.key === "Escape") {
        setIsEditing(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, toast]);

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col transition-all duration-300 ease-in-out">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </h1>
            <Button
              onClick={createNewNote}
              size="sm"
              className="hover:scale-105 transition-transform duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedNotes.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8 animate-fade-in">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {searchTerm ? "No notes found" : "No notes yet"}
              </p>
              <p className="text-sm">
                {searchTerm
                  ? "Try a different search term"
                  : "Create your first note to get started"}
              </p>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedNotes.map((note, index) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-all duration-200 hover:bg-accent hover:shadow-sm hover:scale-[1.02] ${
                    selectedNote?.id === note.id
                      ? "bg-accent border-primary shadow-sm scale-[1.02]"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedNote(note);
                    setIsEditing(false);
                  }}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate hover:text-primary transition-colors">
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {note.isPinned && (
                            <Badge
                              variant="secondary"
                              className="text-xs animate-pulse"
                            >
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {note.updatedAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.content.replace(/<[^>]*>/g, "") || "No content"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 mr-4">
                  {isEditing ? (
                    <Input
                      ref={titleRef}
                      value={selectedNote.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      onBlur={() => setIsEditing(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setIsEditing(false);
                          editorRef.current?.focus();
                        }
                        if (e.key === "Escape") {
                          setIsEditing(false);
                        }
                      }}
                      className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors duration-200 hover:bg-accent/50 rounded px-2 py-1 -mx-2"
                      onClick={() => setIsEditing(true)}
                      title="Click to edit title"
                    >
                      {selectedNote.title}
                    </h2>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    Last updated: {selectedNote.updatedAt.toLocaleString()}
                    {isSaving && (
                      <span className="flex items-center gap-1 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePin(selectedNote.id)}
                    className="hover:scale-105 transition-transform duration-200 cursor-pointer"
                    title={selectedNote.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {selectedNote.isPinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAsPDF}
                    disabled={isExporting}
                    className="hover:scale-105 transition-transform duration-200 bg-transparent cursor-pointer"
                    title="Download as PDF"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:scale-105 transition-transform duration-200 hover:bg-destructive/10 bg-transparent cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="animate-in fade-in-0 zoom-in-95">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Note</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{selectedNote.title}
                          "? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteNote(selectedNote.id)}
                          className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => formatText("bold")}
                  className="hover:scale-105 transition-all duration-200"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => formatText("italic")}
                  className="hover:scale-105 transition-all duration-200"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">
                  Ctrl+N: New note • Ctrl+F: Search • Ctrl+S: Save
                </span>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 p-4">
              <div
                ref={editorRef}
                contentEditable
                className="w-full h-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[400px] bg-background transition-all duration-200 hover:shadow-sm"
                dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                onInput={handleContentChange}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    if (e.key === "b") {
                      e.preventDefault();
                      formatText("bold");
                    } else if (e.key === "i") {
                      e.preventDefault();
                      formatText("italic");
                    }
                  }
                }}
                style={{
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
                data-placeholder="Start typing your note..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center animate-fade-in">
            <div>
              <Edit3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">
                Select a note to edit
              </h2>
              <p className="text-muted-foreground mb-4">
                Choose a note from the sidebar or create a new one to get
                started
              </p>
              <Button
                onClick={createNewNote}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Note (Ctrl+N)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
