'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  Search,
  Users,
  Mail,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Copy,
  Calendar,
  Building2,
  Hash,
  UserCheck,
  Sparkles,
  Plus,
  UserPlus,
  Loader2,
  Phone,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  waitlistApi,
  WaitlistEntry,
  WaitlistStats,
  WaitlistStatus,
  WAITLIST_STATUSES,
  getWaitlistStatusBadgeVariant,
  formatWaitlistStatus,
  getWaitlistEntryName,
  getWaitlistEntryInitials,
} from '@/lib/api/waitlist';

export default function WaitlistPage() {
  // State
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('all');
  const [hasReferralsFilter, setHasReferralsFilter] = useState(false);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [entryToDelete, setEntryToDelete] = useState<WaitlistEntry | null>(null);
  const [entryToInvite, setEntryToInvite] = useState<WaitlistEntry | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isSendingBulkInvites, setIsSendingBulkInvites] = useState(false);

  // Add to waitlist modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
  });

  // Edit modal
  const [entryToEdit, setEntryToEdit] = useState<WaitlistEntry | null>(null);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    status: '' as WaitlistStatus | '',
  });

  // Fetch waitlist entries
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [entriesResult, statsResult] = await Promise.all([
        waitlistApi.list({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          hasReferrals: hasReferralsFilter || undefined,
          limit: 50,
        }),
        waitlistApi.getStats(),
      ]);

      setEntries(entriesResult.items);
      setTotal(entriesResult.total);
      setStats(statsResult);
    } catch (err: any) {
      console.error('Failed to fetch waitlist:', err);
      setError(err.message || "We couldn't load the waitlist right now. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, hasReferralsFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEntries();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Get selectable entries (only PENDING or VERIFIED can be invited)
  const selectableEntries = entries.filter(
    (e) => e.status === 'PENDING' || e.status === 'VERIFIED'
  );
  const selectedInvitable = [...selectedIds].filter((id) =>
    selectableEntries.some((e) => e.id === id)
  );

  // Action handlers
  const handleSendInvite = async () => {
    if (!entryToInvite) return;
    setIsSendingInvite(true);

    try {
      const result = await waitlistApi.sendInvite(entryToInvite.id);
      if (result.success) {
        toast.success(`VIP invite on its way to ${getWaitlistEntryName(entryToInvite)}!`);
        fetchEntries();
      } else {
        toast.error(result.message || "We couldn't send that invite. The email may have bounced previously.");
      }
    } catch (err: any) {
      toast.error("Something went wrong sending the invite. Check the email address and try again.");
    } finally {
      setIsSendingInvite(false);
      setEntryToInvite(null);
    }
  };

  const handleBulkInvite = async () => {
    if (selectedInvitable.length === 0) return;
    setIsSendingBulkInvites(true);

    try {
      const result = await waitlistApi.sendBulkInvites(selectedInvitable);
      if (result.failed === 0) {
        toast.success(`${result.sent} VIP invites sent successfully!`);
      } else {
        toast.success(`Sent ${result.sent} invites. ${result.failed} couldn't be delivered—check those email addresses.`);
      }
      setSelectedIds(new Set());
      fetchEntries();
    } catch (err: any) {
      toast.error("We couldn't send those invites. Please try again or send them individually.");
    } finally {
      setIsSendingBulkInvites(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      await waitlistApi.delete(entryToDelete.id);
      toast.success(`${getWaitlistEntryName(entryToDelete)} has been removed from the waitlist.`);
      fetchEntries();
    } catch (err: any) {
      toast.error("We couldn't remove this founder. They may have already registered.");
    } finally {
      setEntryToDelete(null);
    }
  };

  const copyReferralLink = async (entry: WaitlistEntry) => {
    const link = `${window.location.origin}/founders?ref=${entry.referralCode}`;

    try {
      // Try the modern clipboard API first
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(link);
        toast.success('Referral link copied—share it to help them move up the list!');
      } else {
        // Fallback for browsers without clipboard API or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          toast.success('Referral link copied—share it to help them move up the list!');
        } else {
          toast.error('Could not copy link. Please copy manually: ' + link);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Could not copy link. Please try again.');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEntry.email || !newEntry.email.includes('@')) {
      toast.error("That email doesn't look quite right. Make sure it includes an @ symbol.");
      return;
    }

    setIsAddingEntry(true);

    try {
      const entry = await waitlistApi.create({
        email: newEntry.email,
        firstName: newEntry.firstName || undefined,
        lastName: newEntry.lastName || undefined,
        companyName: newEntry.companyName || undefined,
        phone: newEntry.phone || undefined,
      });

      toast.success(`Welcome ${entry.founderNumber}! ${entry.email} is now on the waitlist.`);
      setShowAddModal(false);
      setNewEntry({ email: '', firstName: '', lastName: '', companyName: '', phone: '' });
      fetchEntries();
    } catch (err: any) {
      if (err.message?.includes('already') || err.message?.includes('exists')) {
        toast.error("This email is already on the waitlist. Search for them above!");
      } else {
        toast.error(err.message || "We couldn't add this founder right now. Please try again.");
      }
    } finally {
      setIsAddingEntry(false);
    }
  };

  // Open edit modal and populate form data
  const openEditModal = (entry: WaitlistEntry) => {
    setEntryToEdit(entry);
    setEditFormData({
      firstName: entry.firstName || '',
      lastName: entry.lastName || '',
      companyName: entry.companyName || '',
      phone: entry.phone || '',
      status: entry.status,
    });
  };

  // Handle edit form submission
  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryToEdit) return;

    setIsEditingEntry(true);

    try {
      const updateData: { firstName?: string; lastName?: string; companyName?: string; phone?: string; status?: WaitlistStatus } = {};

      // Only include changed fields
      if (editFormData.firstName !== (entryToEdit.firstName || '')) {
        updateData.firstName = editFormData.firstName || undefined;
      }
      if (editFormData.lastName !== (entryToEdit.lastName || '')) {
        updateData.lastName = editFormData.lastName || undefined;
      }
      if (editFormData.companyName !== (entryToEdit.companyName || '')) {
        updateData.companyName = editFormData.companyName || undefined;
      }
      if (editFormData.phone !== (entryToEdit.phone || '')) {
        updateData.phone = editFormData.phone || undefined;
      }
      if (editFormData.status && editFormData.status !== entryToEdit.status) {
        updateData.status = editFormData.status as WaitlistStatus;
      }

      await waitlistApi.update(entryToEdit.id, updateData);
      toast.success(`${getWaitlistEntryName(entryToEdit)} updated—changes saved!`);
      setEntryToEdit(null);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "We couldn't save those changes. Please try again.");
    } finally {
      setIsEditingEntry(false);
    }
  };

  return (
    <>
      <Header
        title="Founders Waitlist"
        subtitle="Manage founding members and send invites"
        actions={
          <div className="flex items-center gap-2">
            {selectedInvitable.length > 0 && (
              <Button
                size="sm"
                onClick={handleBulkInvite}
                disabled={isSendingBulkInvites}
              >
                <Send className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {isSendingBulkInvites
                    ? 'Sending...'
                    : `Invite ${selectedInvitable.length} Selected`}
                </span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Founder</span>
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total founders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.invited}</p>
                    <p className="text-xs text-muted-foreground">Invited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <UserCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.registered}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick stats row */}
        {stats && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              {stats.todaySignups} today
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-400" />
              {stats.weekSignups} this week
            </span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 flex-col sm:flex-row w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or founder #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as WaitlistStatus | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {WAITLIST_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={hasReferralsFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHasReferralsFilter(!hasReferralsFilter)}
              className="whitespace-nowrap"
            >
              <Users className="w-4 h-4 mr-1" />
              Has referrals
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Couldn&apos;t load the waitlist</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchEntries}>Try Again</Button>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {search || statusFilter !== 'all' || hasReferralsFilter
                  ? 'No matching founders'
                  : 'Your founder community awaits'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== 'all' || hasReferralsFilter
                  ? "We couldn't find anyone matching those criteria. Try adjusting your search or clearing the filters."
                  : 'Share your waitlist link to start building your VIP founder community, or add founders manually.'}
              </p>
              {!(search || statusFilter !== 'all' || hasReferralsFilter) && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First Founder
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === entries.length && entries.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground">Founder</TableHead>
                  <TableHead className="text-muted-foreground">Position</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Company</TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">Referrals</TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">Signed up</TableHead>
                  <TableHead className="text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                            {getWaitlistEntryInitials(entry)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{getWaitlistEntryName(entry)}</p>
                          <p className="text-xs text-muted-foreground">{entry.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          <Hash className="w-3 h-3 mr-1" />
                          {entry.founderNumber}
                        </Badge>
                        {entry.currentPosition !== entry.basePosition && (
                          <span className="text-xs text-green-400">
                            +{entry.basePosition - entry.currentPosition}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getWaitlistStatusBadgeVariant(entry.status)}>
                        {formatWaitlistStatus(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {entry.companyName || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {entry.referralCount > 0 ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Users className="w-3 h-3" />
                          {entry.referralCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditModal(entry)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit details
                          </DropdownMenuItem>
                          {(entry.status === 'PENDING' || entry.status === 'VERIFIED') && (
                            <DropdownMenuItem onClick={() => setEntryToInvite(entry)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => copyReferralLink(entry)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy referral link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {entry.status !== 'REGISTERED' && (
                            <DropdownMenuItem
                              onClick={() => setEntryToDelete(entry)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Results count */}
        {entries.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {entries.length} of {total} founders
          </p>
        )}
      </div>

      {/* Send Invite Confirmation Modal */}
      {entryToInvite &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Send VIP Invite?</h3>
                  <p className="text-sm text-muted-foreground">
                    {getWaitlistEntryName(entryToInvite)} • {entryToInvite.founderNumber}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;ll send an exclusive founding member invitation to{' '}
                <strong>{entryToInvite.email}</strong>.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                They&apos;ll have <strong>7 days</strong> to claim their spot and complete registration.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEntryToInvite(null)}
                  disabled={isSendingInvite}
                >
                  Not Yet
                </Button>
                <Button onClick={handleSendInvite} disabled={isSendingInvite}>
                  {isSendingInvite ? 'Sending invite...' : 'Send VIP Invite'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {entryToDelete &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Remove {getWaitlistEntryName(entryToDelete)}?
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                This will remove <strong>{entryToDelete.founderNumber}</strong> from the waitlist.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Their founder number will be released and they&apos;ll need to sign up again if they want back in.
              </p>
              <p className="text-sm text-red-400 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEntryToDelete(null)}>
                  Keep on Waitlist
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Yes, Remove
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add Founder Modal */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg mx-4 shadow-xl w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Add a Founder</h3>
                  <p className="text-sm text-muted-foreground">
                    Give someone VIP access to your waitlist
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Email (required) */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={newEntry.email}
                      onChange={(e) => setNewEntry({ ...newEntry, email: e.target.value })}
                      placeholder="sarah@startup.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">They&apos;ll receive their founder number at this address</p>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">First Name</label>
                    <Input
                      type="text"
                      value={newEntry.firstName}
                      onChange={(e) => setNewEntry({ ...newEntry, firstName: e.target.value })}
                      placeholder="Sarah"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Last Name</label>
                    <Input
                      type="text"
                      value={newEntry.lastName}
                      onChange={(e) => setNewEntry({ ...newEntry, lastName: e.target.value })}
                      placeholder="Chen"
                    />
                  </div>
                </div>

                {/* Company name */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={newEntry.companyName}
                      onChange={(e) => setNewEntry({ ...newEntry, companyName: e.target.value })}
                      placeholder="Rocket Commerce"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Helps personalize their founder experience</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={newEntry.phone}
                      onChange={(e) => setNewEntry({ ...newEntry, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewEntry({ email: '', firstName: '', lastName: '', companyName: '', phone: '' });
                    }}
                    disabled={isAddingEntry}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingEntry}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isAddingEntry ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding founder...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Waitlist
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Founder Modal */}
      {entryToEdit &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg mx-4 shadow-xl w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full">
                  <Pencil className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Edit Founder Details</h3>
                  <p className="text-sm text-muted-foreground">
                    {entryToEdit.founderNumber} • {entryToEdit.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleEditEntry} className="space-y-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">First Name</label>
                    <Input
                      type="text"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      placeholder="Sarah"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Last Name</label>
                    <Input
                      type="text"
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      placeholder="Chen"
                    />
                  </div>
                </div>

                {/* Company name */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={editFormData.companyName}
                      onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                      placeholder="Rocket Commerce"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(v) => setEditFormData({ ...editFormData, status: v as WaitlistStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAITLIST_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Changing status won&apos;t automatically send emails</p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEntryToEdit(null)}
                    disabled={isEditingEntry}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isEditingEntry}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {isEditingEntry ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
