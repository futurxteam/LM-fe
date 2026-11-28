import React, { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Users,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Search,
  LogOut,
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Globe,
  GraduationCap,
  Briefcase,
  Calendar,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity,
  Menu,
  Trash2,
  RotateCcw,
  Bell,
  Volume2,
  Key,
  ShieldCheck,
  Zap,
  Send,
  ExternalLink,
  Radio,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Download,
  Clock,
  UserCog,
  UserPlus,
  Edit2,
  UserX,
  Lock,
  Settings,
  MapPin,
  AlertTriangle,
  History,
  IndianRupee,
  TrendingUp,
  Flame,
  Building2,
  ArrowLeft,
  Pause,
  Play,
  Share2,
  Tag,
  ChevronDown,
  List,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { playChime, requestNotificationPermission, sendDesktopNotification, formatArrivalTime } from '../utils/alertUtils'
import StudentProfileModal from '../components/StudentProfileModal'
import ManualLeadModal from '../components/ManualLeadModal'
import CounselorGroupModal from '../components/CounselorGroupModal'
import LeadStepModal from '../components/LeadStepModal'
import AdminAdvancedReports from '../components/AdminAdvancedReports'
import AdminLifecycleSettingsModal from '../components/AdminLifecycleSettingsModal'
import StaffHistoryDrawer from '../components/StaffHistoryDrawer'
import FrdReportsView from '../components/FrdReportsView'
import FollowupScheduleView from '../components/FollowupScheduleView'
import MyProfileTelegramModal from '../components/MyProfileTelegramModal'
import ReferralDashboard from '../components/ReferralDashboard'
import DiscountReportView from '../components/DiscountReportView'
import DiscountApprovalsView from '../components/DiscountApprovalsView'
import ResponseSlaReportView from '../components/ResponseSlaReportView'
import { getStatusBadgeStyle, getHeatBadgeStyle, LEAD_STATUSES, formatINR } from '../constants/leadLifecycle'

export default function AdminDashboard({ user, onLogout, onUserUpdated }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showMyProfileModal, setShowMyProfileModal] = useState(false)

  // Derive active tab from URL path (stays on refreshed page!)
  const getTabFromPath = path => {
    if (path.includes('/pool')) return 'pool'
    if (path.includes('/leads') || path.includes('/all-leads')) return 'all-leads'
    if (path.includes('/discount-approvals')) return 'discount-approvals'
    if (path.includes('/reports')) return 'reports'
    if (path.includes('/users') || path.includes('/team')) return 'users'
    return 'dashboard'
  }

  const activeTab = getTabFromPath(location.pathname)
  const reportSlug = location.pathname.startsWith('/reports/')
    ? location.pathname.replace('/reports/', '').split('/')[0]
    : ''

  // Navigate to separate pages so browser URL updates and refresh does not reset to root!
  const setActiveTab = tab => {
    setMobileMenuOpen(false)
    setShowUserModal(false)
    setEditingUser(null)
    setActiveLeadModal(null)
    setShowManualLeadModal(false)
    setShowGroupModal(false)
    setShowUploadModal(false)
    setShowPasteModal(false)
    setShowResetModal(false)
    setShowMetaModal(false)
    if (tab === 'dashboard') navigate('/dashboard')
    else if (tab === 'pool') navigate('/pool')
    else if (tab === 'all-leads') navigate('/leads')
    else if (tab === 'discount-approvals') navigate('/discount-approvals')
    else if (tab === 'reports') navigate('/reports')
    else if (tab === 'users') navigate('/users')
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingDiscountCount, setPendingDiscountCount] = useState(0)

  useEffect(() => {
    api
      .getPendingDiscountCount()
      .then(res => {
        if (res?.success) setPendingDiscountCount(res.pendingCount || 0)
      })
      .catch(() => {})
  }, [activeTab])

  // Data states
  const [poolLeads, setPoolLeads] = useState([])
  const [masterLeads, setMasterLeads] = useState([])
  const [salesReps, setSalesReps] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Master List & System Pool Backend Pagination ('20' | '30' | '50' | '100')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('30')
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)

  const [poolPage, setPoolPage] = useState(1)
  const [poolPageSize] = useState(30)
  const [poolTotalPages, setPoolTotalPages] = useState(1)
  const [poolTotalCount, setPoolTotalCount] = useState(0)

  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize] = useState(20)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersTotalCount, setUsersTotalCount] = useState(0)

  // Reports Sub-tab: 'advanced' | 'stage' | 'reps' | 'campaigns' | 'demographics'
  const [activeReportSubTab, setActiveReportSubTab] = useState('advanced')
  const [crmMeta, setCrmMeta] = useState(null)
  const [activeStepLead, setActiveStepLead] = useState(null)
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0)
  const [showLifecycleSettingsModal, setShowLifecycleSettingsModal] = useState(false)
  const [lifecycleSettingsInitialTab, setLifecycleSettingsInitialTab] = useState('policy')

  const openSettingsModal = (initialTab = 'policy') => {
    setLifecycleSettingsInitialTab(initialTab)
    setShowLifecycleSettingsModal(true)
  }

  // Selection for bulk assignment/deletion in Pool & Master Leads
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectEntirePool, setSelectEntirePool] = useState(false)
  const [poolSearch, setPoolSearch] = useState('')
  const [selectedMasterLeadIds, setSelectedMasterLeadIds] = useState([])
  const [selectEntireMaster, setSelectEntireMaster] = useState(false)
  const [deletingLeads, setDeletingLeads] = useState(false)
  const [selectedRepId, setSelectedRepId] = useState('')

  // Filters & Search for Master List
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [qualFilter, setQualFilter] = useState('All')

  // Modals & Notifications
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const [activeLeadModal, setActiveLeadModal] = useState(null)
  const [showManualLeadModal, setShowManualLeadModal] = useState(false)
  const [counselorGroups, setCounselorGroups] = useState([])
  const [groupSubTab, setGroupSubTab] = useState('counselors') // 'counselors' | 'groups'
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [notification, setNotification] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Meta Graph API Integration & Alerts State
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [metaTab, setMetaTab] = useState('forms') // 'credentials' | 'forms' | 'alerts'
  const [metaConfig, setMetaConfig] = useState(null)
  const [metaForms, setMetaForms] = useState([])
  const [assigningForm, setAssigningForm] = useState(null) // Form whose counselor assignment popup is open
  const [metaPageIdInput, setMetaPageIdInput] = useState('')
  const [metaAdAccountIdInput, setMetaAdAccountIdInput] = useState('')
  const [metaTokenInput, setMetaTokenInput] = useState('')
  const [metaFormsGroupByCampaign, setMetaFormsGroupByCampaign] = useState(true)
  const [metaFormSearch, setMetaFormSearch] = useState('')
  const [collapsedMetaCampaigns, setCollapsedMetaCampaigns] = useState({})
  const [metaCampaignNotice, setMetaCampaignNotice] = useState('')
  const [metaAutoSync, setMetaAutoSync] = useState(false)
  const [metaAlerts, setMetaAlerts] = useState({
    soundAlert: true,
    browserNotifications: true,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    webhookEnabled: false,
    webhookUrl: '',
  })
  const [fetchingMetaForms, setFetchingMetaForms] = useState(false)
  const [savingMetaConfig, setSavingMetaConfig] = useState(false)
  const [savingMetaForms, setSavingMetaForms] = useState(false)
  const [syncingMetaLeads, setSyncingMetaLeads] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [browserPermissionState, setBrowserPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )

  // Form Leads Preview & Optional Ingestion State
  const [showFormPreviewModal, setShowFormPreviewModal] = useState(false)
  const [previewFormId, setPreviewFormId] = useState('')
  const [previewFormName, setPreviewFormName] = useState('')
  const [previewLeads, setPreviewLeads] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSelectedIds, setPreviewSelectedIds] = useState([])
  const [importingPreview, setImportingPreview] = useState(false)
  const [previewTokenExpired, setPreviewTokenExpired] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewFilter, setPreviewFilter] = useState('all') // 'all' | 'new' | 'pool' | 'assigned'

  // User Management State (Disable-Only — Disabled / Old Sales Reps hidden by default)
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all') // 'all' | 'sales' | 'admin'
  const [showDisabledUsers, setShowDisabledUsers] = useState(false)
  const [disabledUsersCount, setDisabledUsersCount] = useState(0)
  const [historyUserId, setHistoryUserId] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales',
    title: 'Admissions Counselor',
    specialty: 'Healthcare Admissions',
    active: true,
    telegramChatId: '',
    telegramNotificationsEnabled: false,
    telegramPreferences: {
      newLead: true,
      leadAssigned: true,
      discountRequested: true,
      discountDecision: true,
      businessMilestone: true,
    },
  })
  const [testingUserTelegram, setTestingUserTelegram] = useState(false)
  const [userTelegramFeedback, setUserTelegramFeedback] = useState(null)
  const [fetchingBotChats, setFetchingBotChats] = useState(false)
  const [detectedBotChats, setDetectedBotChats] = useState([])
  const [detectedBotUsername, setDetectedBotUsername] = useState('')
  const [generatingConnectLink, setGeneratingConnectLink] = useState(false)
  const [userConnectUrl, setUserConnectUrl] = useState('')
  const [togglingTelegramUserId, setTogglingTelegramUserId] = useState(null)
  const [savingUser, setSavingUser] = useState(false)
  const [showDisableUserModal, setShowDisableUserModal] = useState(false)
  const [disablingUser, setDisablingUser] = useState(null)
  const [disableHandoverMode, setDisableHandoverMode] = useState('keep') // 'keep' | 'reassign_open'
  const [disableTargetRepId, setDisableTargetRepId] = useState('pool')
  const [disablingInProgress, setDisablingInProgress] = useState(false)

  // Counselor Pause States
  const [showPauseUserModal, setShowPauseUserModal] = useState(false)
  const [pausingUser, setPausingUser] = useState(null)
  const [pauseStartDate, setPauseStartDate] = useState('')
  const [pauseEndDate, setPauseEndDate] = useState('')
  const [pauseReason, setPauseReason] = useState('')
  const [pausingInProgress, setPausingInProgress] = useState(false)

  const prevPoolCountRef = useRef(null)

  // Load initial stats, pool & users
  const loadCrmMeta = async () => {
    try {
      const meta = await api.getCrmMeta()
      setCrmMeta(meta)
    } catch (err) {
      console.warn('Could not load CRM lifecycle meta:', err.message)
    }
  }

  useEffect(() => {
    loadCrmMeta()
  }, [])

  const openStepModalById = async leadId => {
    const localMatch =
      masterLeads.find(l => l.id === leadId) || poolLeads.find(l => l.id === leadId)
    if (localMatch) {
      setActiveStepLead(localMatch)
      return
    }
    try {
      const res = await api.getLeads({ page: 1, limit: 200 })
      const list = Array.isArray(res) ? res : res?.leads || []
      const found = list.find(l => l.id === leadId || l._id === leadId)
      if (found) setActiveStepLead(found)
    } catch (err) {
      showNotify('error', 'Could not open lead timeline')
    }
  }
  useEffect(() => {
    loadOverviewData()
    loadUsers()
  }, [])

  // Load Meta configuration on component mount
  useEffect(() => {
    api.getMetaConfig().then(res => {
      if (res?.config) {
        setMetaConfig(res.config)
        setMetaPageIdInput(res.config.pageId || '')
        setMetaAutoSync(Boolean(res.config.autoSync))
        if (res.config.alerts) {
          setMetaAlerts({
            soundAlert: res.config.alerts.soundAlert !== false,
            browserNotifications: res.config.alerts.browserNotifications !== false,
            telegramEnabled: !!res.config.alerts.telegramEnabled,
            telegramBotToken: res.config.alerts.telegramBotToken || '',
            telegramChatId: res.config.alerts.telegramChatId || '',
            webhookEnabled: !!res.config.alerts.webhookEnabled,
            webhookUrl: res.config.alerts.webhookUrl || '',
          })
        }
        if (res.config.selectedForms && res.config.selectedForms.length > 0) {
          setMetaForms(res.config.selectedForms)
        }
      }
    }).catch(err => console.warn('Could not load Meta config:', err.message))
  }, [])

  const loadCounselorGroups = async () => {
    try {
      const res = await api.getGroups()
      if (res?.groups) {
        setCounselorGroups(res.groups)
      }
    } catch (err) {
      console.warn('Failed to load counselor groups:', err.message)
    }
  }

  // Load counselor groups on mount
  useEffect(() => {
    loadCounselorGroups()
  }, [])

  // Dynamic tab switcher: loads specific page data and closes overlays when navigating
  useEffect(() => {
    setShowUserModal(false)
    setEditingUser(null)
    setActiveLeadModal(null)
    setShowManualLeadModal(false)
    setShowGroupModal(false)
    setShowUploadModal(false)
    setShowPasteModal(false)
    setShowResetModal(false)
    setShowMetaModal(false)

    if (activeTab === 'pool') {
      loadOverviewData()
    } else if (activeTab === 'all-leads') {
      loadMasterLeads(page, pageSize)
    } else if (activeTab === 'users') {
      loadUsers()
      loadCounselorGroups()
    } else if (activeTab === 'reports') {
      api.getStats().then(setStats).catch(() => { })
    }
  }, [activeTab])

  // Background poller every 30 seconds for new leads in the pool & audio chime
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadOverviewData(true)
    }, 30000)
    return () => clearInterval(pollInterval)
  }, [metaAlerts])

  // Load master list whenever page, pageSize or filters change
  useEffect(() => {
    if (activeTab === 'all-leads') {
      setSelectedMasterLeadIds([])
      setSelectEntireMaster(false)
      loadMasterLeads(page, pageSize)
    }
  }, [page, pageSize, statusFilter, qualFilter, searchQuery, activeTab])

  // Reload System Pool when poolPage or poolSearch changes
  useEffect(() => {
    if (activeTab === 'pool') {
      setSelectedLeadIds([])
      setSelectEntirePool(false)
      loadOverviewData(false, poolPage, poolSearch)
    }
  }, [poolPage, poolSearch])

  // Overview loader (Backend-paginated System Pool)
  const loadOverviewData = async (
    isBackgroundPoll = false,
    targetPoolPage = poolPage,
    targetPoolSearch = poolSearch
  ) => {
    if (!isBackgroundPoll) setLoading(true)
    try {
      const [poolData, repsData, statsData] = await Promise.all([
        api.getLeads({
          poolOnly: true,
          page: targetPoolPage,
          limit: poolPageSize,
          search: targetPoolSearch && targetPoolSearch.trim() ? targetPoolSearch.trim() : undefined,
        }),
        api.getSalesReps(),
        api.getStats(),
      ])

      const list = Array.isArray(poolData) ? poolData : (poolData?.leads || [])
      const pTotal = Array.isArray(poolData) ? list.length : (poolData?.total ?? list.length)
      const pPages = Array.isArray(poolData) ? 1 : (poolData?.totalPages || 1)
      setPoolLeads(list)
      setPoolTotalCount(pTotal)
      setPoolTotalPages(pPages)
      setSalesReps(repsData || [])
      setStats(statsData || null)
      if (repsData && repsData.length > 0 && !selectedRepId) {
        setSelectedRepId(repsData[0].id)
      }

      // Detect newly arrived leads in pool for Sound / Browser Notification alert
      if (prevPoolCountRef.current !== null && isBackgroundPoll) {
        const diff = pTotal - prevPoolCountRef.current
        if (diff > 0) {
          if (metaAlerts.soundAlert) {
            playChime()
          }
          if (metaAlerts.browserNotifications) {
            sendDesktopNotification(
              'New Meta Leads in Pool!',
              `${diff} new candidate lead(s) arrived in the unassigned pool!`
            )
          }
          showNotify('success', `${diff} new candidate lead(s) arrived in the pool!`)
        }
      }
      prevPoolCountRef.current = pTotal
    } catch (err) {
      if (!isBackgroundPoll) {
        console.error('Error fetching overview data:', err)
        showNotify('error', err.message || 'Failed to load live data')
      }
    } finally {
      if (!isBackgroundPoll) setLoading(false)
    }
  }

  // Master leads loader (Strictly Backend-Paginated)
  const loadMasterLeads = async (targetPage = page, sizeOption = pageSize) => {
    setLoading(true)
    try {
      const limitNum = parseInt(sizeOption) || 30
      const queryParams = {
        status: statusFilter !== 'All' ? statusFilter : undefined,
        qualification: qualFilter !== 'All' ? qualFilter : undefined,
        search: searchQuery.trim() || undefined,
        page: targetPage,
        limit: limitNum,
      }

      const res = await api.getLeads(queryParams)

      if (res && res.leads) {
        setMasterLeads(res.leads)
        setTotalLeadsCount(res.total)
        setTotalPages(res.totalPages || 1)
        setPage(res.page || 1)
      } else if (Array.isArray(res)) {
        setMasterLeads(res)
        setTotalLeadsCount(res.length)
        setTotalPages(1)
        setPage(1)
      }
    } catch (err) {
      console.error('Failed to load master leads:', err)
      showNotify('error', err.message || 'Failed to load master leads')
    } finally {
      setLoading(false)
    }
  }

  const showNotify = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Handle Pool Selection
  const toggleSelectLead = id => {
    if (selectEntirePool) {
      setSelectEntirePool(false)
      setSelectedLeadIds(poolLeads.map(l => l.id).filter(x => x !== id))
      return
    }
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPool = () => {
    setSelectEntirePool(false)
    const unassignedIds = poolLeads.map(l => l.id)
    if (unassignedIds.length > 0 && unassignedIds.every(id => selectedLeadIds.includes(id))) {
      setSelectedLeadIds([])
    } else {
      setSelectedLeadIds(unassignedIds)
    }
  }

  const toggleSelectEntirePool = () => {
    if (selectEntirePool) {
      setSelectEntirePool(false)
      setSelectedLeadIds([])
    } else if (poolTotalCount > 0) {
      setSelectEntirePool(true)
      setSelectedLeadIds(poolLeads.map(l => l.id))
    }
  }

  // Manual Assignment
  const handleManualAssign = async () => {
    if (!selectEntirePool && selectedLeadIds.length === 0) {
      showNotify('error', 'Select at least one lead from the pool')
      return
    }
    if (!selectedRepId) {
      showNotify('error', 'Select a sales representative')
      return
    }

    if (selectEntirePool) {
      const targetRep = salesReps.find(r => String(r.id) === String(selectedRepId))
      const repName = targetRep?.name || 'selected counselor'
      const scopeLabel = poolSearch.trim()
        ? `ALL ${poolTotalCount} matching pool lead(s)`
        : `ENTIRE System Pool (${poolTotalCount} lead(s))`
      if (!window.confirm(`Assign ${scopeLabel} to ${repName}?`)) return
    }

    try {
      const res = selectEntirePool
        ? await api.assignLeads([], selectedRepId, {
          applyToAll: true,
          scope: 'pool',
          search: poolSearch.trim() || undefined,
        })
        : await api.assignLeads(selectedLeadIds, selectedRepId)
      showNotify('success', res.message || 'Leads assigned successfully')
      setSelectEntirePool(false)
      setSelectedLeadIds([])
      setPoolPage(1)
      await loadOverviewData(false, 1, poolSearch)
    } catch (err) {
      showNotify('error', err.message || 'Assignment failed')
    }
  }

  // Automated Round Robin
  const handleAutoAssign = async () => {
    if (selectEntirePool) {
      if (!window.confirm(`Run Auto Round-Robin on ALL ${poolTotalCount} pool lead(s)?`)) return
    }
    try {
      const res = await api.autoAssignLeads(
        !selectEntirePool && selectedLeadIds.length > 0 ? selectedLeadIds : [],
        'round-robin',
        { search: poolSearch.trim() || undefined }
      )
      showNotify('success', res.message || `Auto-assigned ${res.assignedCount} leads`)
      setSelectEntirePool(false)
      setSelectedLeadIds([])
      setPoolPage(1)
      await loadOverviewData(false, 1, poolSearch)
    } catch (err) {
      showNotify('error', err.message || 'Auto-assignment failed')
    }
  }

  // Return to Pool
  const handleUnassign = async leadIds => {
    try {
      const res = await api.unassignLeads(leadIds)
      showNotify('success', res.message || 'Lead returned to unassigned pool')
      await loadOverviewData()
      if (activeTab === 'all-leads') {
        await loadMasterLeads(page)
      }
    } catch (err) {
      showNotify('error', err.message || 'Unassign failed')
    }
  }

  // Toggle selection in Master Leads directory
  const toggleSelectMasterLead = leadId => {
    if (selectEntireMaster) {
      setSelectEntireMaster(false)
      setSelectedMasterLeadIds(masterLeads.map(l => l.id).filter(id => id !== leadId))
      return
    }
    setSelectedMasterLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    )
  }

  const toggleSelectAllMasterLeads = () => {
    setSelectEntireMaster(false)
    const allIds = masterLeads.map(l => l.id)
    if (allIds.length > 0 && allIds.every(id => selectedMasterLeadIds.includes(id))) {
      setSelectedMasterLeadIds([])
    } else {
      setSelectedMasterLeadIds(allIds)
    }
  }

  const toggleSelectEntireMaster = () => {
    if (selectEntireMaster) {
      setSelectEntireMaster(false)
      setSelectedMasterLeadIds([])
    } else if (totalLeadsCount > 0) {
      setSelectEntireMaster(true)
      setSelectedMasterLeadIds(masterLeads.map(l => l.id))
    }
  }

  // Delete single lead (Assigned or System Pool)
  const handleDeleteLead = async lead => {
    const leadId = lead?.id || lead?._id
    if (!leadId) return
    const label = lead.fullName || lead.phone || 'this lead'
    const isAssigned = lead.assignmentStatus === 'ASSIGNED'
    const confirmMsg = isAssigned
      ? `Remove assigned lead "${label}" (${lead.assignedTo?.repName || 'Counselor'}) permanently from CRM?`
      : `Remove lead "${label}" permanently from System Pool?`
    if (!window.confirm(confirmMsg)) return

    setDeletingLeads(true)
    try {
      const res = await api.deleteLead(leadId)
      showNotify('success', res.message || `Removed lead "${label}"`)
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId))
      setSelectedMasterLeadIds(prev => prev.filter(id => id !== leadId))
      if (activeLeadModal && (activeLeadModal.id === leadId || activeLeadModal._id === leadId)) {
        setActiveLeadModal(null)
      }
      await loadOverviewData()
      if (activeTab === 'all-leads') {
        await loadMasterLeads(page, pageSize)
      }
    } catch (err) {
      showNotify('error', err.message || 'Failed to remove lead')
    } finally {
      setDeletingLeads(false)
    }
  }

  // Bulk delete selected leads (System Pool or Assigned/Master Leads — page or entire list)
  const handleBulkDeleteLeads = async (leadIds, source = 'pool') => {
    const isEntirePool = source === 'pool' && selectEntirePool
    const isEntireMaster = source === 'master' && selectEntireMaster

    if (!isEntirePool && !isEntireMaster && (!Array.isArray(leadIds) || leadIds.length === 0)) {
      showNotify('error', 'Select at least one lead to remove')
      return
    }

    const confirmMsg = isEntirePool
      ? `Permanently remove ALL ${poolTotalCount} lead(s) from System Pool${poolSearch.trim() ? ' matching current search' : ''}? This cannot be undone.`
      : isEntireMaster
        ? `Permanently remove ALL ${totalLeadsCount} matching lead(s) from CRM (Master Leads)? This cannot be undone.`
        : `Permanently remove ${leadIds.length} selected lead(s) ${source === 'pool' ? 'from System Pool' : 'from CRM (Assigned / Master Leads)'}?`

    if (!window.confirm(confirmMsg)) return

    setDeletingLeads(true)
    try {
      let res
      if (isEntirePool) {
        res = await api.bulkDeleteLeads({
          applyToAll: true,
          scope: 'pool',
          filters: { search: poolSearch.trim() || undefined },
        })
      } else if (isEntireMaster) {
        res = await api.bulkDeleteLeads({
          applyToAll: true,
          scope: 'master',
          filters: {
            status: statusFilter !== 'All' ? statusFilter : undefined,
            qualification: qualFilter !== 'All' ? qualFilter : undefined,
            search: searchQuery.trim() || undefined,
          },
        })
      } else {
        res = await api.bulkDeleteLeads({ leadIds })
      }
      showNotify('success', res.message || `Removed ${res.deletedCount || leadIds.length} lead(s)`)
      if (source === 'pool') {
        setSelectedLeadIds([])
        setSelectEntirePool(false)
        setPoolPage(1)
        await loadOverviewData(false, 1, poolSearch)
      } else {
        setSelectedMasterLeadIds([])
        setSelectEntireMaster(false)
        setPage(1)
        await loadOverviewData()
        await loadMasterLeads(1, pageSize)
      }
    } catch (err) {
      showNotify('error', err.message || 'Failed to remove selected leads')
    } finally {
      setDeletingLeads(false)
    }
  }

  // Remove already-ingested leads from Retrieved Meta Form Preview modal
  const handleRemovePreviewLeads = async leadsToRemove => {
    const existingLeads = (leadsToRemove || []).filter(
      l => l.isExistingInDb || l.systemState === 'ASSIGNED' || l.systemState === 'IN_POOL'
    )
    if (existingLeads.length === 0) {
      showNotify('error', 'No selected retrieved leads are currently stored in the CRM database.')
      return
    }

    const confirmMsg =
      existingLeads.length === 1
        ? `Remove "${existingLeads[0].fullName}" from CRM (${existingLeads[0].assignedAdvisor ? `Assigned: ${existingLeads[0].assignedAdvisor}` : 'In Pool'})?`
        : `Remove ${existingLeads.length} retrieved lead(s) from CRM (Assigned & System Pool)?`
    if (!window.confirm(confirmMsg)) return

    const leadIds = existingLeads.map(l => l.existingLeadId).filter(Boolean)
    const metaLeadIds = existingLeads.map(l => l.metaLeadId).filter(Boolean)

    setDeletingLeads(true)
    try {
      const res = await api.bulkDeleteLeads({ leadIds, metaLeadIds })
      showNotify('success', res.message || `Removed ${res.deletedCount || existingLeads.length} lead(s) from CRM`)

      const removedMetaSet = new Set(metaLeadIds)
      setPreviewLeads(prev =>
        prev.map(l =>
          removedMetaSet.has(l.metaLeadId)
            ? {
              ...l,
              isExistingInDb: false,
              systemState: 'NOT_IN_SYSTEM',
              assignedAdvisor: null,
              existingLeadId: null,
              existingAssignment: null,
            }
            : l
        )
      )
      setPreviewSelectedIds(prev => prev.filter(id => !removedMetaSet.has(id)))

      await loadOverviewData()
      if (activeTab === 'all-leads') {
        await loadMasterLeads(page, pageSize)
      }
    } catch (err) {
      showNotify('error', err.message || 'Failed to remove retrieved leads')
    } finally {
      setDeletingLeads(false)
    }
  }

  // File Upload (XLSX, XLS, CSV, TSV) - supports file input change & drag-and-drop
  const handleFileUpload = async eventOrFile => {
    let file = null
    if (eventOrFile?.target?.files?.[0]) {
      file = eventOrFile.target.files[0]
    } else if (eventOrFile instanceof File) {
      file = eventOrFile
    } else if (eventOrFile?.dataTransfer?.files?.[0]) {
      file = eventOrFile.dataTransfer.files[0]
    }
    if (!file) return

    setUploading(true)
    try {
      const res = await api.uploadLeadsFile(file)
      showNotify('success', res.message || `Imported ${res.addedCount} new leads from ${file.name}`)
      setShowUploadModal(false)
      setIsDragging(false)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'File upload failed')
    } finally {
      setUploading(false)
      if (eventOrFile?.target) eventOrFile.target.value = ''
    }
  }

  // Temporary Tool: Reset / Clean Lead Database
  const handleResetDb = async (mode = 'clean') => {
    setResetting(true)
    try {
      const res = await api.resetLeadDatabase(mode)
      showNotify('success', res.message || 'Lead database updated successfully')
      setShowResetModal(false)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'Failed to reset database')
    } finally {
      setResetting(false)
    }
  }

  // Paste Text Submission
  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      showNotify('error', 'Please paste TSV, CSV or Meta lead data')
      return
    }

    setUploading(true)
    try {
      const res = await api.pasteLeadsText(pasteContent)
      showNotify('success', res.message || `Extracted & added ${res.addedCount} leads to pool`)
      setPasteContent('')
      setShowPasteModal(false)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'Failed to parse pasted data')
    } finally {
      setUploading(false)
    }
  }

  // Status Change directly from Admin
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.updateLeadStatus(leadId, {
        status: newStatus,
        subStatus: newStatus === 'Contacted' ? 'Interested - Admin Update' : 'Ringing / No Answer',
        author: 'Admin',
        note: `Status updated to ${newStatus} by Admin`,
      })
      showNotify('success', `Lead status updated to ${newStatus}`)
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(page)
    } catch (err) {
      showNotify('error', err.message || 'Failed to update status')
    }
  }

  // -------------------------------------------------------------
  // Meta Graph API Integration Handlers
  // -------------------------------------------------------------
  const openMetaModal = async () => {
    setShowMetaModal(true)
    setMetaCampaignNotice('')
    try {
      const res = await api.getMetaConfig()
      if (res?.config) {
        setMetaConfig(res.config)
        setMetaPageIdInput(res.config.pageId || '')
        setMetaAdAccountIdInput(res.config.adAccountId || '')
        setMetaAutoSync(Boolean(res.config.autoSync))
        if (res.config.selectedForms && res.config.selectedForms.length > 0) {
          setMetaForms(res.config.selectedForms)
          setMetaTab('forms')
          // Auto-fetch campaign links from Meta if any form with submissions is not yet linked
          const hasUnlinkedWithLeads = res.config.selectedForms.some(
            f => !f.campaignName && Number(f.leadsCount || 0) > 0
          )
          if (res.config.hasToken && hasUnlinkedWithLeads) {
            setFetchingMetaForms(true)
            api
              .fetchPageForms({
                pageId: res.config.pageId || undefined,
                adAccountId: res.config.adAccountId || undefined,
              })
              .then(fetchRes => {
                if (fetchRes?.forms) setMetaForms(fetchRes.forms)
                const warn = [fetchRes?.adAccountWarning, fetchRes?.leadLookupWarning].filter(Boolean).join(' • ')
                if (warn) setMetaCampaignNotice(warn)
              })
              .catch(() => {})
              .finally(() => setFetchingMetaForms(false))
          }
        } else {
          setMetaTab('credentials')
        }
        if (res.config.alerts) {
          setMetaAlerts({
            soundAlert: res.config.alerts.soundAlert !== false,
            browserNotifications: res.config.alerts.browserNotifications !== false,
            telegramEnabled: !!res.config.alerts.telegramEnabled,
            telegramBotToken: res.config.alerts.telegramBotToken || '',
            telegramChatId: res.config.alerts.telegramChatId || '',
            webhookEnabled: !!res.config.alerts.webhookEnabled,
            webhookUrl: res.config.alerts.webhookUrl || '',
          })
        }
      }
    } catch (err) {
      console.warn('Error loading Meta config on open:', err)
    }
  }

  const handleSaveMetaCredentials = async () => {
    setSavingMetaConfig(true)
    try {
      const payload = {
        pageId: metaPageIdInput.trim(),
        adAccountId: metaAdAccountIdInput.trim(),
        autoSync: metaAutoSync,
        alerts: metaAlerts,
      }
      if (metaTokenInput.trim()) {
        payload.accessToken = metaTokenInput.trim()
      }
      const res = await api.saveMetaConfig(payload)
      setMetaConfig(res.config)
      setMetaTokenInput('')
      showNotify('success', 'Meta Graph API credentials saved successfully')
    } catch (err) {
      showNotify('error', err.message || 'Failed to save Meta credentials')
    } finally {
      setSavingMetaConfig(false)
    }
  }

  const handleFetchMetaForms = async () => {
    setFetchingMetaForms(true)
    setMetaCampaignNotice('')
    try {
      const payload = {}
      if (metaPageIdInput.trim()) payload.pageId = metaPageIdInput.trim()
      if (metaAdAccountIdInput.trim()) payload.adAccountId = metaAdAccountIdInput.trim()
      if (metaTokenInput.trim()) payload.accessToken = metaTokenInput.trim()

      const res = await api.fetchPageForms(payload)
      if (res?.forms) {
        setMetaForms(res.forms)
        setMetaTab('forms')
        const warn = [res.adAccountWarning, res.leadLookupWarning].filter(Boolean).join(' • ')
        if (warn) setMetaCampaignNotice(warn)
        const mappedText =
          typeof res.mappedCampaignsCount === 'number'
            ? ` (${res.mappedCampaignsCount} linked to campaigns)`
            : ''
        showNotify('success', `Connected! Found ${res.forms.length} Lead Ads forms${mappedText}.`)
        const confRes = await api.getMetaConfig()
        if (confRes?.config) setMetaConfig(confRes.config)
      }
    } catch (err) {
      showNotify('error', err.message || 'Failed to fetch forms from Meta Graph API')
    } finally {
      setFetchingMetaForms(false)
    }
  }

  const handleToggleForm = formId => {
    setMetaForms(prev =>
      prev.map(f => (f.formId === formId ? { ...f, active: !f.active } : f))
    )
  }

  const handleToggleCampaignForms = (formIds, targetActive) => {
    const idSet = new Set(formIds.map(String))
    setMetaForms(prev =>
      prev.map(f => (idSet.has(String(f.formId)) ? { ...f, active: targetActive } : f))
    )
  }

  const toggleMetaCampaignCollapse = groupKey => {
    setCollapsedMetaCampaigns(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  const handleSelectAllForms = activeState => {
    setMetaForms(prev => prev.map(f => ({ ...f, active: activeState })))
  }

  const handleSaveFormsSelection = async formsOverride => {
    setSavingMetaForms(true)
    try {
      const sourceForms = Array.isArray(formsOverride) ? formsOverride : metaForms
      const activeRepIdSet = new Set(salesReps.map(r => String(r.id || r._id)))
      const cleanedForms = sourceForms.map(f => {
        const rawIds = Array.isArray(f.assignedCounselorIds) ? f.assignedCounselorIds.map(String) : []
        const validIds = Array.from(new Set(rawIds.filter(id => activeRepIdSet.has(id))))
        return {
          ...f,
          assignedCounselorIds: validIds.length >= salesReps.length ? [] : validIds,
        }
      })
      const res = await api.saveSelectedForms(cleanedForms)
      showNotify('success', res.message || 'Active form selection saved!')
      setMetaForms(cleanedForms)
      const confRes = await api.getMetaConfig()
      if (confRes?.config) {
        setMetaConfig(confRes.config)
        if (Array.isArray(confRes.config.selectedForms)) {
          setMetaForms(confRes.config.selectedForms)
        }
      }
    } catch (err) {
      showNotify('error', err.message || 'Failed to save forms selection')
    } finally {
      setSavingMetaForms(false)
    }
  }

  // -------------------------------------------------------------
  // Form Routing Assignment Helpers (Default: All Counselors)
  // Always prune stale/deleted/disabled counselor IDs not in active salesReps
  // -------------------------------------------------------------
  const getValidAssignedIds = form => {
    if (!form) return []
    const activeRepIdSet = new Set(salesReps.map(r => String(r.id || r._id)))
    const rawIds = Array.isArray(form.assignedCounselorIds) ? form.assignedCounselorIds.map(String) : []
    return Array.from(new Set(rawIds.filter(id => activeRepIdSet.has(id))))
  }

  const isFormAllSelected = form => {
    if (!form) return true
    const ids = getValidAssignedIds(form)
    return ids.length === 0 || (salesReps.length > 0 && ids.length >= salesReps.length)
  }

  const isFormCounselorSelected = (form, repId) => {
    if (!form) return false
    if (isFormAllSelected(form)) return true
    return getValidAssignedIds(form).includes(String(repId))
  }

  const getAssignedLabel = form => {
    if (!form) return 'All Counselors (Round-Robin)'
    const ids = getValidAssignedIds(form)
    if (ids.length === 0 || (salesReps.length > 0 && ids.length >= salesReps.length)) {
      return 'All Counselors (Round-Robin)'
    }
    if (ids.length === 1) {
      const rep = salesReps.find(r => String(r.id || r._id) === String(ids[0]))
      return rep ? `${rep.name} (Direct 100%)` : '1 Counselor'
    }
    return `${ids.length} Counselors (Round-Robin)`
  }

  const getFormRoutingSummary = form => {
    if (!form) return ''
    const ids = getValidAssignedIds(form)
    if (ids.length === 0 || (salesReps.length > 0 && ids.length >= salesReps.length)) {
      return 'Incoming leads will rotate capacity-aware between ALL active counselors.'
    }
    if (ids.length === 1) {
      const rep = salesReps.find(r => String(r.id || r._id) === String(ids[0]))
      return `100% of leads from this form will go directly to ${rep?.name || 'this counselor'}.`
    }
    return `Incoming leads will round-robin between the ${ids.length} selected counselors.`
  }

  const handleToggleAllCounselorsForForm = formId => {
    setMetaForms(prev =>
      prev.map(f => {
        if (f.formId !== formId) return f
        return {
          ...f,
          assignedCounselorIds: [],
        }
      })
    )
    setAssigningForm(prev => (prev ? { ...prev, assignedCounselorIds: [] } : null))
  }

  const handleToggleCounselorForForm = (formId, repId) => {
    const targetRepId = String(repId)
    const targetForm =
      (assigningForm && assigningForm.formId === formId ? assigningForm : null) ||
      metaForms.find(f => f.formId === formId)
    let currentIds = getValidAssignedIds(targetForm)
    const isCurrentlyAll =
      currentIds.length === 0 || (salesReps.length > 0 && currentIds.length >= salesReps.length)

    if (isCurrentlyAll) {
      currentIds = [targetRepId]
    } else if (currentIds.includes(targetRepId)) {
      currentIds = currentIds.filter(id => id !== targetRepId)
      if (currentIds.length === 0) {
        currentIds = []
      }
    } else {
      currentIds = [...currentIds, targetRepId]
      if (salesReps.length > 0 && currentIds.length >= salesReps.length) {
        currentIds = []
      }
    }

    const nextAssignedIds = currentIds
    setMetaForms(prev =>
      prev.map(f => (f.formId === formId ? { ...f, assignedCounselorIds: nextAssignedIds } : f))
    )
    setAssigningForm(prev =>
      prev && prev.formId === formId ? { ...prev, assignedCounselorIds: nextAssignedIds } : prev
    )
  }

  const handleTriggerMetaSync = async (forceFullSync = false) => {
    setSyncingMetaLeads(true)
    try {
      const res = await api.syncMetaLeads({ forceFullSync })
      const added = res.addedCount || 0
      showNotify('success', res.message || `Meta sync completed! +${added} leads added.`)
      if (added > 0 && metaAlerts.soundAlert) {
        playChime()
      }
      if (added > 0 && metaAlerts.browserNotifications) {
        sendDesktopNotification(
          'Meta Leads Ingested!',
          `+${added} new candidate leads retrieved from Facebook Lead Ads!`
        )
      }
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
      const confRes = await api.getMetaConfig()
      if (confRes?.config) setMetaConfig(confRes.config)
    } catch (err) {
      if (err.isTokenExpired || /expired|token/i.test(err.message || '')) {
        showNotify('error', 'Meta Access Token Expired! Please paste a renewed token in Meta Settings.')
      } else {
        showNotify('error', err.message || 'Meta sync failed')
      }
    } finally {
      setSyncingMetaLeads(false)
    }
  }

  const handleTestChime = () => {
    playChime()
    showNotify('success', 'Playing dual-tone lead chime!')
  }

  const handleTestBrowserNotification = async () => {
    const perm = await requestNotificationPermission()
    setBrowserPermissionState(perm)
    if (perm === 'granted') {
      sendDesktopNotification(
        'Futureace Academy CRM',
        'Desktop push notifications are enabled! You will be alerted when new leads arrive.'
      )
      showNotify('success', 'Notification permission granted! Sent test alert.')
    } else if (perm === 'denied') {
      showNotify('error', 'Notification permission was blocked in browser settings.')
    } else {
      showNotify('error', 'Notification permission not granted.')
    }
  }

  const handleTestTelegram = async () => {
    if (!metaAlerts.telegramBotToken || !metaAlerts.telegramChatId) {
      showNotify('error', 'Please provide both Telegram Bot Token and Chat ID')
      return
    }
    setTestingTelegram(true)
    try {
      const res = await api.testTelegramAlert({
        botToken: metaAlerts.telegramBotToken,
        chatId: metaAlerts.telegramChatId,
      })
      showNotify('success', res.message || 'Telegram test message sent successfully!')
    } catch (err) {
      showNotify('error', err.message || 'Telegram delivery failed')
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!metaAlerts.webhookUrl) {
      showNotify('error', 'Please provide a Webhook URL')
      return
    }
    setTestingWebhook(true)
    try {
      const res = await api.testWebhookAlert({ webhookUrl: metaAlerts.webhookUrl })
      showNotify('success', res.message || 'Webhook ping sent successfully!')
    } catch (err) {
      showNotify('error', err.message || 'Webhook delivery failed')
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleSaveAlerts = async () => {
    setSavingMetaConfig(true)
    try {
      await api.saveMetaConfig({ alerts: metaAlerts })
      showNotify('success', 'Alert preferences saved successfully!')
      const confRes = await api.getMetaConfig()
      if (confRes?.config) setMetaConfig(confRes.config)
    } catch (err) {
      showNotify('error', err.message || 'Failed to save alert settings')
    } finally {
      setSavingMetaConfig(false)
    }
  }

  // -------------------------------------------------------------
  // Form Leads Preview & Optional Ingestion Handlers
  // -------------------------------------------------------------
  const handleOpenFormPreview = async (formId, formName) => {
    setPreviewFormId(formId)
    setPreviewFormName(formName)
    setShowFormPreviewModal(true)
    setPreviewLoading(true)
    setPreviewLeads([])
    setPreviewSelectedIds([])
    setPreviewTokenExpired(false)
    setPreviewError('')
    setPreviewFilter('all')

    try {
      const res = await api.previewFormLeads(formId)
      if (res?.leads) {
        setPreviewLeads(res.leads)
        if (res.totalFetched !== undefined) {
          setMetaForms(prev =>
            prev.map(f => (f.formId === formId ? { ...f, leadsCount: res.totalFetched } : f))
          )
        }
        // Auto-select candidates who are NOT already in the database
        const newLeadIds = res.leads
          .filter(l => l.systemState === 'NOT_IN_SYSTEM' || !l.isExistingInDb)
          .map(l => l.metaLeadId)
        setPreviewSelectedIds(newLeadIds)
      }
    } catch (err) {
      const isExpired = err.isTokenExpired || /expired|token|OAuth/i.test(err.message || '')
      setPreviewTokenExpired(Boolean(isExpired))
      setPreviewError(err.message || 'Failed to preview leads for this form')
      showNotify('error', err.message || 'Failed to preview leads for this form')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleTogglePreviewSelect = metaLeadId => {
    setPreviewSelectedIds(prev =>
      prev.includes(metaLeadId) ? prev.filter(id => id !== metaLeadId) : [...prev, metaLeadId]
    )
  }

  const handleSelectAllPreview = (onlyNew = false) => {
    if (onlyNew) {
      setPreviewSelectedIds(
        previewLeads
          .filter(l => l.systemState === 'NOT_IN_SYSTEM' || !l.isExistingInDb)
          .map(l => l.metaLeadId)
      )
    } else {
      setPreviewSelectedIds(previewLeads.map(l => l.metaLeadId))
    }
  }

  const handleDeselectAllPreview = () => {
    setPreviewSelectedIds([])
  }

  const handleImportSelectedLeads = async () => {
    if (previewSelectedIds.length === 0) {
      showNotify('error', 'Select at least one lead to add to the pool')
      return
    }

    const selectedLeadObjects = previewLeads.filter(l => previewSelectedIds.includes(l.metaLeadId))
    setImportingPreview(true)

    try {
      const res = await api.importSelectedLeads(selectedLeadObjects)
      const added = res.addedCount || 0
      showNotify('success', res.message || `Added ${added} lead(s) to unassigned pool!`)
      if (added > 0 && metaAlerts.soundAlert) {
        playChime()
      }
      if (added > 0 && metaAlerts.browserNotifications) {
        sendDesktopNotification(
          'Leads Added to Pool!',
          `${added} candidate lead(s) added to the unassigned pool!`
        )
      }

      // Mark the imported leads as existing in DB (In Pool)
      setPreviewLeads(prev =>
        prev.map(l =>
          previewSelectedIds.includes(l.metaLeadId)
            ? { ...l, isExistingInDb: true, systemState: l.assignedAdvisor ? 'ASSIGNED' : 'IN_POOL' }
            : l
        )
      )
      setPreviewSelectedIds([])

      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'Failed to import selected leads')
    } finally {
      setImportingPreview(false)
    }
  }

  // -------------------------------------------------------------
  // User Management Handlers (Disable-Only — Zero Account Deletion)
  // -------------------------------------------------------------
  const loadUsers = async (
    targetPage = usersPage,
    targetShowDisabled = showDisabledUsers,
    targetRole = userRoleFilter,
    targetSearch = userSearch
  ) => {
    setUsersLoading(true)
    try {
      const res = await api.getUsers({
        page: targetPage,
        limit: usersPageSize,
        status: targetShowDisabled ? 'disabled' : 'active',
        role: targetRole,
        search: targetSearch,
      })
      if (res?.users) {
        setUsersList(res.users)
        setUsersTotalCount(res.totalCount ?? res.users.length)
        setUsersTotalPages(res.totalPages || 1)
        setDisabledUsersCount(res.disabledCount ?? 0)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      showNotify('error', err.message || 'Failed to load staff users')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(usersPage, showDisabledUsers, userRoleFilter, userSearch)
    }
  }, [usersPage, showDisabledUsers, userRoleFilter, userSearch])

  const handleOpenCreateUser = () => {
    setEditingUser(null)
    setUserTelegramFeedback(null)
    setUserConnectUrl('')
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'sales',
      title: 'Admissions Counselor',
      specialty: 'Healthcare Admissions',
      groupId: '',
      active: true,
      telegramChatId: '',
      telegramNotificationsEnabled: false,
      telegramPreferences: {
        newLead: true,
        leadAssigned: true,
        discountRequested: true,
        discountDecision: true,
        businessMilestone: true,
      },
    })
    setShowUserModal(true)
  }

  const handleOpenEditUser = u => {
    setEditingUser(u)
    setUserTelegramFeedback(null)
    setUserConnectUrl('')
    setUserFormData({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'sales',
      title: u.title || (u.role === 'admin' ? 'Administrator' : 'Admissions Counselor'),
      specialty: u.specialty || 'Healthcare Admissions',
      groupId: u.groupId || '',
      active: u.active !== false,
      telegramChatId: u.telegramChatId || '',
      telegramNotificationsEnabled: Boolean(u.telegramNotificationsEnabled),
      telegramPreferences: {
        newLead: u.telegramPreferences?.newLead !== false,
        leadAssigned: u.telegramPreferences?.leadAssigned !== false,
        discountRequested: u.telegramPreferences?.discountRequested !== false,
        discountDecision: u.telegramPreferences?.discountDecision !== false,
        businessMilestone: u.telegramPreferences?.businessMilestone !== false,
      },
    })
    setShowUserModal(true)
  }

  const handleToggleUserTelegram = async (e, u) => {
    e.stopPropagation()
    if (!u.telegramChatId) {
      showNotify('error', `Set a Telegram Chat ID for ${u.name} first.`)
      handleOpenEditUser(u)
      return
    }
    setTogglingTelegramUserId(u.id)
    try {
      const nextEnabled = !u.telegramNotificationsEnabled
      const res = await api.updateUserTelegram(u.id, {
        telegramNotificationsEnabled: nextEnabled,
      })
      showNotify('success', res.message || `Telegram alerts ${nextEnabled ? 'enabled' : 'disabled'} for ${u.name}`)
      await loadUsers(usersPage, showDisabledUsers, userRoleFilter, userSearch)
    } catch (err) {
      showNotify('error', err.message || 'Failed to update Telegram setting')
    } finally {
      setTogglingTelegramUserId(null)
    }
  }

  const handleGenerateUserConnectLink = async () => {
    if (!editingUser?.id) return
    setGeneratingConnectLink(true)
    setUserTelegramFeedback(null)
    try {
      const res = await api.getUserTelegramConnectLink(editingUser.id)
      if (res?.connectUrl) {
        setUserConnectUrl(res.connectUrl)
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(res.connectUrl).catch(() => {})
        }
        setUserTelegramFeedback({
          type: 'success',
          message: `Unique Connect Link copied! Share it with ${editingUser.name} — once they press Start in Telegram, their Chat ID saves automatically.`,
        })
      }
    } catch (err) {
      setUserTelegramFeedback({
        type: 'error',
        message: err.message || 'Failed to generate unique Telegram connection link.',
      })
    } finally {
      setGeneratingConnectLink(false)
    }
  }

  const handleFetchBotChats = async () => {
    setFetchingBotChats(true)
    setUserTelegramFeedback(null)
    try {
      const res = await api.getTelegramChats()
      const chats = Array.isArray(res?.chats) ? res.chats : []
      setDetectedBotChats(chats)
      setDetectedBotUsername(res?.botUsername || '')
      if (chats.length === 0) {
        setUserTelegramFeedback({
          type: 'error',
          message: `No recent chats found. Ask the user to open ${res?.botUsername || 'your Telegram bot'} and press Start (/start), then click Fetch Chat IDs again.`,
        })
      }
    } catch (err) {
      setUserTelegramFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch recent Telegram chats.',
      })
    } finally {
      setFetchingBotChats(false)
    }
  }

  const handleTestUserTelegram = async () => {
    const cleanChatId = String(userFormData.telegramChatId || '').trim()
    if (!cleanChatId) {
      const msg = 'Enter a Telegram Chat ID first to send a test alert.'
      setUserTelegramFeedback({ type: 'error', message: msg })
      showNotify('error', msg)
      return
    }
    setTestingUserTelegram(true)
    setUserTelegramFeedback(null)
    try {
      const res = editingUser
        ? await api.testUserTelegram(editingUser.id, { chatId: cleanChatId })
        : await api.testCrmTelegram({ chatId: cleanChatId, eventKey: 'newLead' })
      const okMsg = res.message || 'Test Telegram alert sent!'
      setUserTelegramFeedback({ type: 'success', message: okMsg })
      showNotify('success', okMsg)
    } catch (err) {
      const errMsg = err.message || 'Failed to send test Telegram alert'
      setUserTelegramFeedback({ type: 'error', message: errMsg })
      showNotify('error', errMsg)
    } finally {
      setTestingUserTelegram(false)
    }
  }

  const handleSaveUser = async e => {
    if (e && e.preventDefault) e.preventDefault()
    if (!userFormData.name.trim()) {
      showNotify('error', 'Please enter full name')
      return
    }
    if (!userFormData.email.trim()) {
      showNotify('error', 'Please enter a valid work email')
      return
    }
    if (!editingUser && !userFormData.password.trim()) {
      showNotify('error', 'Please provide a starting password')
      return
    }

    setSavingUser(true)
    try {
      if (editingUser) {
        const payload = { ...userFormData }
        if (!payload.password || !payload.password.trim()) {
          delete payload.password
        }
        const res = await api.updateUser(editingUser.id, payload)
        showNotify('success', res.message || `Updated ${userFormData.name}`)
      } else {
        const res = await api.createUser(userFormData)
        showNotify('success', res.message || `Created ${userFormData.name}`)
      }
      setShowUserModal(false)
      await loadUsers()
      const repsData = await api.getSalesReps()
      setSalesReps(repsData || [])
    } catch (err) {
      showNotify('error', err.message || 'Failed to save user')
    } finally {
      setSavingUser(false)
    }
  }

  const handleOpenDisableUser = u => {
    setDisablingUser(u)
    setDisableHandoverMode('keep')
    setDisableTargetRepId('pool')
    setShowDisableUserModal(true)
  }

  const handleConfirmDisableUser = async () => {
    if (!disablingUser) return
    setDisablingInProgress(true)
    try {
      const res = await api.disableOrEnableUser(disablingUser.id, {
        active: false,
        handoverMode: disableHandoverMode,
        targetRepId: disableHandoverMode === 'reassign_open' ? disableTargetRepId : '',
      })
      showNotify('success', res.message || `${disablingUser.name} has been disabled`)
      setShowDisableUserModal(false)
      setDisablingUser(null)
      await loadUsers(1, showDisabledUsers, userRoleFilter, userSearch)
      setUsersPage(1)
      const repsData = await api.getSalesReps()
      setSalesReps(repsData || [])
      await loadOverviewData()
      if (activeTab === 'all-leads') await loadMasterLeads(1)
    } catch (err) {
      showNotify('error', err.message || 'Failed to disable staff account')
    } finally {
      setDisablingInProgress(false)
    }
  }

  const handleReEnableUser = async u => {
    if (!window.confirm(`Re-enable ${u.name}'s account so they can log in again?`)) return
    try {
      const res = await api.disableOrEnableUser(u.id, { active: true })
      showNotify('success', res.message || `${u.name} is now Active`)
      await loadUsers(1, showDisabledUsers, userRoleFilter, userSearch)
      setUsersPage(1)
      const repsData = await api.getSalesReps()
      setSalesReps(repsData || [])
    } catch (err) {
      showNotify('error', err.message || 'Failed to re-enable user')
    }
  }

  const handleOpenPauseUser = u => {
    setPausingUser(u)
    const todayStr = new Date().toISOString().split('T')[0]
    setPauseStartDate(u.pauseStartDate ? new Date(u.pauseStartDate).toISOString().split('T')[0] : todayStr)
    setPauseEndDate(u.pauseEndDate ? new Date(u.pauseEndDate).toISOString().split('T')[0] : '')
    setPauseReason(u.pauseReason || '')
    setShowPauseUserModal(true)
  }

  const handleConfirmPauseUser = async targetPauseState => {
    if (!pausingUser) return
    setPausingInProgress(true)
    try {
      const res = await api.pauseUser(pausingUser.id, {
        isPaused: targetPauseState,
        pauseStartDate: targetPauseState ? pauseStartDate : null,
        pauseEndDate: targetPauseState && pauseEndDate ? pauseEndDate : null,
        pauseReason: targetPauseState ? pauseReason.trim() : '',
      })
      showNotify('success', res.message || 'Counselor pause updated successfully')
      setShowPauseUserModal(false)
      setPausingUser(null)
      await loadUsers(usersPage, showDisabledUsers, userRoleFilter, userSearch)
    } catch (err) {
      showNotify('error', err.message || 'Failed to update pause status')
    } finally {
      setPausingInProgress(false)
    }
  }

  // Dials definition for Overview tab
  const totalCount = stats?.totalLeads || 0
  const poolCount = stats?.poolCount || poolLeads.length || 0
  const assignedCount = stats?.assignedCount || 0
  const contactedCount = stats?.contactedCount || 0
  const notContactedCount = stats?.notContactedCount || 0
  const enrolledCount = stats?.enrolledCount || 0

  const gaugeMetrics = [
    { label: 'Unassigned Pool', subtext: `${poolCount} Leads Waiting`, percent: totalCount > 0 ? Math.round((poolCount / totalCount) * 100) : 0, color: '#8b5cf6' },
    { label: 'Assigned Leads', subtext: `${assignedCount} Distributed`, percent: totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0, color: '#00b4d8' },
    { label: 'Contacted Rate', subtext: `${contactedCount} Connected`, percent: stats?.contactRate || 0, color: '#10b981' },
    { label: 'Not Contacted', subtext: `${notContactedCount} Pending Calls`, percent: assignedCount > 0 ? Math.round((notContactedCount / assignedCount) * 100) : 0, color: '#f59e0b' },
    { label: 'Enrolled / Won', subtext: `${enrolledCount} Conversions`, percent: stats?.conversionRate || 0, color: '#059669' },
  ]

  return (
    <div className="app-container">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Left Sidebar (Fixed desktop / Slide-over mobile drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-drawer-top">
            <button
              className="sidebar-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Navigation"
              title="Close Menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="brand-logo-container">
            <img src="/logo-brand-white.png" alt="Futureace Academy Logo" className="brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <h2>CRM</h2>
            <span>Admin Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <span className="nav-item-icon"><LayoutDashboard size={16} /></span>
            <span>Dashboard Overview</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'pool' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('pool')
              setMobileMenuOpen(false)
              loadOverviewData()
            }}
          >
            <span className="nav-item-icon"><Layers size={16} /></span>
            <span>Lead Pool & Assign</span>
            {poolCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#8b5cf6', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                {poolCount}
              </span>
            )}
          </div>

          <div
            className={`nav-item ${activeTab === 'all-leads' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('all-leads')
              setMobileMenuOpen(false)
              loadMasterLeads(1)
            }}
          >
            <span className="nav-item-icon"><Users size={16} /></span>
            <span>All Company Leads</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              {totalCount || totalLeadsCount}
            </span>
          </div>

          <div
            className={`nav-item ${activeTab === 'discount-approvals' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('discount-approvals')
              setMobileMenuOpen(false)
            }}
          >
            <span className="nav-item-icon"><Tag size={16} /></span>
            <span>Discount Approvals</span>
            {pendingDiscountCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>
                {pendingDiscountCount}
              </span>
            )}
          </div>

          <div
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('reports')
              setMobileMenuOpen(false)
            }}
          >
            <span className="nav-item-icon"><BarChart3 size={16} /></span>
            <span>Reports & Analytics</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users')
              setMobileMenuOpen(false)
              loadUsers()
            }}
          >
            <span className="nav-item-icon"><UserCog size={16} /></span>
            <span>User Management</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              {usersList.length || salesReps.length}
            </span>
          </div>
        </nav>

        {/* Rep Status Overview in Sidebar */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 }}>
            Sales Reps Active
          </div>
          {salesReps.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#cbd5e1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                {r.name}
              </span>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                {r.totalAssigned || 0} leads
              </span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              setShowMyProfileModal(true)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#bae6fd',
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Send size={13} />
            <span>My Profile &amp; Telegram</span>
          </button>
          <button className="btn-sidebar-logout" onClick={onLogout}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area (Only pages scrollable) */}
      <main className="main-content">
        <div className="content-area">
          {/* Sleek Minimal Header Row with Hamburger Menu on Mobile and Small Refresh Button */}
          <div className="page-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn-hamburger"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                title="Open Navigation Menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="page-title">
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'pool' && 'Lead Pool & Allocation'}
                  {activeTab === 'all-leads' && 'Master Company Leads Directory'}
                  {activeTab === 'discount-approvals' && 'Discount Approvals Queue'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                  {activeTab === 'users' && 'Staff & Admissions Advisors Management'}
                </h1>
                <p className="page-subtitle">
                  Futureace Academy CRM • Admissions & Lead Allocation System
                </p>
              </div>
            </div>
            <button
              className="btn-refresh-icon"
              onClick={() => {
                loadOverviewData()
                if (activeTab === 'all-leads') loadMasterLeads(page)
                if (activeTab === 'users') loadUsers()
              }}
              title="Refresh Live Data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Global Notification Banner */}
          {notification && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 6,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 500,
                background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
                color: notification.type === 'error' ? '#991b1b' : '#166534',
                border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
              }}
            >
              {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notification.message}</span>
            </div>
          )}
          {/* ========================================================
              TAB 1: DASHBOARD OVERVIEW
              Shows the Live Ingestion & Conversion Pipeline (ONLY HERE!)
              ======================================================== */}
          {activeTab === 'dashboard' && (
            loading ? (
              <div className="template-card">
                <div className="data-loader-container">
                  <div className="data-loader-spinner" />
                  <div className="data-loader-text">Loading Real-Time CRM Analytics & Pipeline...</div>
                  <div className="data-loader-sub">Connecting to database</div>
                </div>
              </div>
            ) : (
              <div>
                {/* Pending Discount Approval Requests Banner on Admin Dashboard */}
                {pendingDiscountCount > 0 && (
                  <div
                    onClick={() => setActiveTab('discount-approvals')}
                    style={{
                      marginBottom: 16,
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: '1.5px solid #f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {pendingDiscountCount}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                          {pendingDiscountCount} Discount Approval {pendingDiscountCount === 1 ? 'Request' : 'Requests'} Pending
                        </div>
                        <div style={{ fontSize: 11, color: '#78350f' }}>
                          Leads are locked awaiting your review. Click to approve, adjust agreed amount, or reject.
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Review Now <ArrowRight size={14} />
                    </span>
                  </div>
                )}

                {/* LIVE INGESTION & CONVERSION PIPELINE (Only on Dashboard Overview!) */}
                <div className="template-card" style={{ marginBottom: 20 }}>
                  <div className="template-card-header">
                    <h3>Live Ingestion & Conversion Pipeline</h3>
                    <span className="header-badge">{totalCount} Total Extracted Leads</span>
                  </div>
                  <div className="template-card-body">
                    <div className="dial-grid">
                      {gaugeMetrics.map((gauge, idx) => {
                        const radius = 38
                        const circumference = 2 * Math.PI * radius
                        const offset = circumference - (gauge.percent / 100) * circumference
                        return (
                          <div key={idx} className="dial-item">
                            <div className="dial-circle-wrapper">
                              <svg className="dial-circle-svg" viewBox="0 0 96 96">
                                <circle className="dial-circle-bg" cx="48" cy="48" r={radius} />
                                <circle
                                  className="dial-circle-fill"
                                  cx="48"
                                  cy="48"
                                  r={radius}
                                  stroke={gauge.color}
                                  strokeWidth="8"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                />
                              </svg>
                              <div className="dial-circle-text">{gauge.percent}%</div>
                            </div>
                            <div className="dial-label">{gauge.label}</div>
                            <div className="dial-subtext">{gauge.subtext}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Actions & Navigation Cards */}
                <div className="stage-report-grid">
                  <div
                    className="stage-stat-card"
                    style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
                    onClick={() => setActiveTab('pool')}
                  >
                    <div className="stage-stat-title">Unassigned Lead Pool</div>
                    <div className="stage-stat-value">{poolCount}</div>
                    <div className="stage-stat-sub">
                      Leads waiting for counselor assignment → Click to Allocate
                    </div>
                  </div>

                  <div
                    className="stage-stat-card"
                    style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTab('all-leads')
                      setStatusFilter('Contacted')
                    }}
                  >
                    <div className="stage-stat-title">Contacted Prospects</div>
                    <div className="stage-stat-value" style={{ color: '#10b981' }}>{contactedCount}</div>
                    <div className="stage-stat-sub">
                      {stats?.contactRate || 0}% overall contact rate across team
                    </div>
                  </div>

                  <div
                    className="stage-stat-card"
                    style={{ borderLeft: '4px solid #0284c7', cursor: 'pointer' }}
                    onClick={() => navigate('/reports/stage')}
                  >
                    <div className="stage-stat-title">Active Outreach Stage</div>
                    <div className="stage-stat-value" style={{ color: '#0284c7' }}>
                      {assignedCount}
                    </div>
                    <div className="stage-stat-sub">
                      Distributed across {salesReps.length} admissions counselors
                    </div>
                  </div>

                  <div
                    className="stage-stat-card"
                    style={{ borderLeft: '4px solid #059669', cursor: 'pointer' }}
                    onClick={() => navigate('/reports/business')}
                  >
                    <div className="stage-stat-title">Qual / Conv / Onboarded</div>
                    <div className="stage-stat-value" style={{ color: '#059669', fontSize: 22 }}>
                      {stats?.qualifiedCount || 0} / {stats?.convertedCount || 0} / {stats?.onboardedCount || 0}
                    </div>
                    <div className="stage-stat-sub">
                      Turnover: <strong>{formatINR(stats?.businessTurnover || 0)}</strong> • Collected: <strong style={{ color: '#059669' }}>{formatINR(stats?.salesRevenue || 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* Rep Leaderboard Snapshot on Dashboard */}
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>Sales Representatives Quick Snapshot</h3>
                    <button
                      className="header-badge"
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => navigate('/reports/counselors')}
                    >
                      View Detailed Leaderboard →
                    </button>
                  </div>
                  <div className="template-card-body" style={{ padding: 0 }}>
                    <table className="reps-table">
                      <thead>
                        <tr>
                          <th>Counselor</th>
                          <th>Specialty Territory</th>
                          <th>Assigned</th>
                          <th>Contacted</th>
                          <th>Contact Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReps.map(rep => (
                          <tr key={rep.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="rep-avatar">{rep.avatar}</span>
                                <div style={{ fontWeight: 600 }}>{rep.name}</div>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: '#475569' }}>{rep.specialty}</td>
                            <td style={{ fontWeight: 600 }}>{rep.totalAssigned || 0}</td>
                            <td style={{ color: '#166534', fontWeight: 600 }}>{rep.contactedCount || 0}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#10b981' }}>{rep.contactRate || 0}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================
              TAB 2: LEAD POOL & ASSIGN
              NO live ingestion pipeline card here!
              IMPORT OPTIONS ONLY HERE!
              ======================================================== */}
          {activeTab === 'pool' && (
            <div>
              {/* Pool Toolbar with IMPORT BUTTONS ONLY IN THIS TAB */}
              <div className="pool-action-bar">
                <div className="pool-action-group">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    Pool Ingestion:
                  </span>
                  {/* Meta Live Graph API */}
                  <button
                    className="btn-pulse"
                    onClick={openMetaModal}
                    style={{
                      background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 6px rgba(24, 119, 242, 0.35)',
                      padding: '7px 13px',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    title="Connect Meta Graph API, select lead forms and configure alerts"
                  >
                    <Globe size={15} />
                    <span>Meta Graph API Sync</span>
                    {metaForms.filter(f => f.active).length > 0 && (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)',
                          color: '#fff',
                          borderRadius: 10,
                          fontSize: 11,
                          padding: '1px 7px',
                          fontWeight: 700,
                        }}
                      >
                        {metaForms.filter(f => f.active).length} Active
                      </span>
                    )}
                  </button>

                  {/* Course & Fee Structure Master Button */}
                  <button
                    type="button"
                    className="btn-pulse"
                    onClick={() => openSettingsModal('programs')}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Configure Course Programs, Variants & Fee Structure"
                  >
                    <IndianRupee size={14} />
                    <span>Course &amp; Fee Structure</span>
                  </button>

                  {/* Lifecycle & Policy Settings */}
                  <button
                    type="button"
                    className="btn-pulse-secondary"
                    onClick={() => openSettingsModal('policy')}
                    style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600 }}
                    title="Configure Max Lost Cycles, Recycle Mode & Business Rules"
                  >
                    <Settings size={13} />
                    <span>Policy &amp; Rules</span>
                  </button>

                  {/* Manual Student Lead Addition */}
                  <button
                    className="btn-pulse"
                    onClick={() => setShowManualLeadModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 13px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    title="Manually type in a new student inquiry"
                  >
                    <UserPlus size={14} />
                    <span>+ Add Student Lead</span>
                  </button>

                  {/* IMPORT OPTIONS ONLY HERE */}
                  <button className="btn-pulse-accent" onClick={() => setShowUploadModal(true)}>
                    <FileSpreadsheet size={14} />
                    <span>Import XLSX / CSV</span>
                  </button>
                  <button className="btn-pulse-secondary" onClick={() => setShowPasteModal(true)}>
                    <ClipboardPaste size={14} />
                    <span>Paste Meta Data</span>
                  </button>
                  {/* Clean Lead Database */}
                  <button
                    className="btn-pulse-danger"
                    onClick={() => setShowResetModal(true)}
                    title="Clear all leads from the database"
                  >
                    <Trash2 size={14} />
                    <span>Clear Leads</span>
                  </button>
                </div>

                <div className="pool-action-group">
                  <button
                    className="btn-pulse-secondary"
                    onClick={toggleSelectAllPool}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    {!selectEntirePool && selectedLeadIds.length === poolLeads.length && poolLeads.length > 0
                      ? `Deselect Page (${poolLeads.length})`
                      : `Select Page (${poolLeads.length})`}
                  </button>

                  {poolTotalCount > 0 && (
                    <button
                      type="button"
                      className={selectEntirePool ? 'btn-pulse' : 'btn-pulse-secondary'}
                      onClick={toggleSelectEntirePool}
                      style={{
                        fontSize: 12,
                        padding: '6px 12px',
                        border: selectEntirePool ? '1px solid #1b2b6b' : '1px solid #0284c7',
                        color: selectEntirePool ? '#ffffff' : '#0369a1',
                        background: selectEntirePool ? '#1b2b6b' : '#f0f9ff',
                      }}
                      title="Select all leads across every page in System Pool"
                    >
                      <CheckSquare size={14} />
                      <span>
                        {selectEntirePool
                          ? `Deselect Entire (${poolTotalCount})`
                          : `Select Entire (${poolTotalCount})`}
                      </span>
                    </button>
                  )}

                  {/* Manual Assign Select */}
                  <div className="pool-manual-assign-row">
                    <select
                      value={selectedRepId}
                      onChange={e => setSelectedRepId(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {salesReps.map(rep => (
                        <option key={rep.id} value={rep.id}>
                          Assign to: {rep.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-pulse"
                      onClick={handleManualAssign}
                      disabled={!selectEntirePool && selectedLeadIds.length === 0}
                      style={{ opacity: !selectEntirePool && selectedLeadIds.length === 0 ? 0.5 : 1 }}
                    >
                      <UserCheck size={14} />
                      <span>Assign ({selectEntirePool ? poolTotalCount : selectedLeadIds.length})</span>
                    </button>
                    <button
                      className="btn-pulse-danger"
                      onClick={() => handleBulkDeleteLeads(selectedLeadIds, 'pool')}
                      disabled={(!selectEntirePool && selectedLeadIds.length === 0) || deletingLeads}
                      style={{ opacity: (!selectEntirePool && selectedLeadIds.length === 0) || deletingLeads ? 0.5 : 1 }}
                      title="Remove selected leads from System Pool"
                    >
                      <Trash2 size={14} />
                      <span>Remove ({selectEntirePool ? poolTotalCount : selectedLeadIds.length})</span>
                    </button>
                  </div>

                  {/* Auto Round-Robin Button */}
                  <button
                    className="btn-pulse-accent"
                    onClick={handleAutoAssign}
                    title="Evenly distribute pool leads among all active sales reps"
                  >
                    <Sparkles size={14} />
                    <span>Auto Round-Robin</span>
                  </button>
                </div>

                {/* Pool Search Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    marginTop: 8,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                  }}
                >
                  <Search size={15} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search pool leads by name, ID, phone number, or email..."
                    value={poolSearch}
                    onChange={e => {
                      setPoolSearch(e.target.value)
                      setPoolPage(1)
                    }}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, background: 'transparent' }}
                  />
                  {poolSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPoolSearch('')
                        setPoolPage(1)
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex' }}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pool Table Card */}
              <div className="template-card">
                <div className="template-card-header">
                  <h3>Unassigned Leads in Pool</h3>
                  <span className="header-badge">{poolTotalCount} Available to Allocate</span>
                </div>
                {selectEntirePool && poolTotalCount > 0 && (
                  <div
                    style={{
                      padding: '8px 16px',
                      background: '#eff6ff',
                      borderBottom: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: '#1e3a8a',
                    }}
                  >
                    <span>
                      <strong>All {poolTotalCount} leads</strong> across all {poolTotalPages} page(s) in System Pool are selected.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectEntirePool(false)
                        setSelectedLeadIds([])
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
                <div className="template-card-body" style={{ padding: 0 }}>
                  {loading ? (
                    <div className="data-loader-container">
                      <div className="data-loader-spinner" />
                      <div className="data-loader-text">Loading unassigned lead pool...</div>
                      <div className="data-loader-sub">Fetching leads from database</div>
                    </div>
                  ) : poolLeads.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                      <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
                        {poolSearch.trim() ? 'No pool leads match your search' : 'Lead pool is currently clear!'}
                      </p>
                      <p style={{ fontSize: 13, marginTop: 4 }}>
                        {poolSearch.trim()
                          ? 'Try searching by candidate name, Lead ID, phone number, or email.'
                          : <>All incoming leads have been assigned. Use the <strong>Import XLSX / CSV</strong> button above to upload a new batch.</>}
                      </p>
                    </div>
                  ) : (
                    <div className="leads-table-container">
                      <table className="leads-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>
                              <input
                                type="checkbox"
                                checked={
                                  selectEntirePool ||
                                  (selectedLeadIds.length === poolLeads.length && poolLeads.length > 0)
                                }
                                onChange={toggleSelectAllPool}
                              />
                            </th>
                            <th>Candidate / Contact</th>
                            <th>Course Enquired</th>
                            <th>Time of Arrival</th>
                            <th>Qualification & Degree</th>
                            <th>Preferred Location</th>
                            <th>Mode / Role</th>
                            <th>Campaign / Platform</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poolLeads.map(lead => {
                            const isSelected = selectEntirePool || selectedLeadIds.includes(lead.id)
                            return (
                              <tr
                                key={lead.id}
                                style={{ background: isSelected ? '#f5f3ff' : 'transparent' }}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectLead(lead.id)}
                                  />
                                </td>
                                <td>
                                  <div
                                    style={{ fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                                    onClick={() => setActiveLeadModal(lead)}
                                  >
                                    {lead.fullName}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#475569' }}>{lead.phone}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                    {lead.email ? `${lead.email} • ` : ''}
                                    <span style={{ fontFamily: 'monospace' }}>
                                      #{lead.metaLeadId ? lead.metaLeadId.slice(-6) : lead.id?.slice(-6)}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                                    {lead.courseProgram || lead.businessProgramName || 'Not Specified'}
                                  </div>
                                  {(lead.courseVariant || lead.businessProgramVariant) && (
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      {lead.courseVariant || lead.businessProgramVariant}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                                    <Clock size={13} color="#0284c7" />
                                    <span>{formatArrivalTime(lead.createdTime || lead.createdAt)}</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                    {lead.createdTime ? new Date(lead.createdTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                                    <GraduationCap size={13} color="#0369a1" />
                                    {lead.qualification}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#334155' }}>
                                    <Globe size={13} color="#64748b" />
                                    {lead.preferredLocation}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.careerRole || 'Hospital Admin'}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{lead.learningMode}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.platform}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.campaignName}>
                                    {lead.campaignName}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(lead)}
                                    disabled={deletingLeads}
                                    title="Remove lead from System Pool"
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: 4,
                                      border: '1px solid #fecaca',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: deletingLeads ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {poolTotalCount > 0 && (
                    <div className="pagination-container">
                      <div>
                        Showing{' '}
                        <strong>
                          {(poolPage - 1) * poolPageSize + 1} - {Math.min(poolPage * poolPageSize, poolTotalCount)}
                        </strong>{' '}
                        of <strong>{poolTotalCount}</strong> pool leads (Page {poolPage} of {poolTotalPages})
                      </div>
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={poolPage <= 1 || loading}
                          onClick={() => setPoolPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={poolPage >= poolTotalPages || loading}
                          onClick={() => setPoolPage(p => Math.min(poolTotalPages, p + 1))}
                        >
                          <span>Next</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: ALL COMPANY LEADS (BACKEND PAGINATED BY 30)
              NO live ingestion pipeline card here!
              ======================================================== */}
          {activeTab === 'all-leads' && (
            <div>
              {/* Search & Filters */}
              <div className="pool-action-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Search leads by name, ID, phone number, email, qualification or city..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setPage(1)
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Status Badges Filter */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['All', 'NEW LEAD', 'HOT', 'WARM', 'COLD', 'NON-CONNECT', 'NON PROSPECT', 'LOST', 'QUALIFIED BUSINESS', 'CONVERTED BUSINESS', 'ONBOARDED BUSINESS'].map(st => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st)
                          setPage(1)
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: statusFilter === st ? '#1b2b6b' : '#f1f5f9',
                          color: statusFilter === st ? '#ffffff' : '#475569',
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Qualification Filter */}
                  <select
                    value={qualFilter}
                    onChange={e => {
                      setQualFilter(e.target.value)
                      setPage(1)
                    }}
                    style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="All">All Qualifications</option>
                    <option value="Post Graduation">Post Graduation</option>
                    <option value="Graduation / Degree">Graduation / Degree</option>
                  </select>

                  {/* View Mode: Show All vs Paginated */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Display:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(e.target.value)
                        setPage(1)
                      }}
                      style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600, background: '#fff' }}
                    >
                      <option value="20">20 per page</option>
                      <option value="30">30 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>

                  {/* Select Page / Select Entire & Bulk Remove */}
                  {totalLeadsCount > 0 && (
                    <>
                      <button
                        type="button"
                        className="btn-pulse-secondary"
                        onClick={toggleSelectAllMasterLeads}
                        style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
                      >
                        {!selectEntireMaster && masterLeads.length > 0 && masterLeads.every(l => selectedMasterLeadIds.includes(l.id))
                          ? `Deselect Page (${masterLeads.length})`
                          : `Select Page (${masterLeads.length})`}
                      </button>
                      <button
                        type="button"
                        className={selectEntireMaster ? 'btn-pulse' : 'btn-pulse-secondary'}
                        onClick={toggleSelectEntireMaster}
                        style={{
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: selectEntireMaster ? '1px solid #1b2b6b' : '1px solid #0284c7',
                          color: selectEntireMaster ? '#ffffff' : '#0369a1',
                          background: selectEntireMaster ? '#1b2b6b' : '#f0f9ff',
                        }}
                        title="Select all matching leads across all pages"
                      >
                        <CheckSquare size={13} />
                        <span>
                          {selectEntireMaster
                            ? `Deselect Entire (${totalLeadsCount})`
                            : `Select Entire (${totalLeadsCount})`}
                        </span>
                      </button>
                    </>
                  )}
                  {(selectEntireMaster || selectedMasterLeadIds.length > 0) && (
                    <button
                      type="button"
                      className="btn-pulse-danger"
                      onClick={() => handleBulkDeleteLeads(selectedMasterLeadIds, 'master')}
                      disabled={deletingLeads}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      title="Remove selected leads from CRM"
                    >
                      <Trash2 size={13} />
                      <span>
                        Remove Selected ({selectEntireMaster ? totalLeadsCount : selectedMasterLeadIds.length})
                      </span>
                    </button>
                  )}

                  {/* Course & Fee Structure Master Button */}
                  <button
                    type="button"
                    className="btn-pulse"
                    onClick={() => openSettingsModal('programs')}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Configure Course Programs, Variants & Fee Structure"
                  >
                    <IndianRupee size={14} />
                    <span>Course &amp; Fee Structure</span>
                  </button>

                  {/* Lifecycle & Policy Settings */}
                  <button
                    type="button"
                    className="btn-pulse-secondary"
                    onClick={() => openSettingsModal('policy')}
                    style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600 }}
                    title="Configure Max Lost Cycles, Recycle Mode & Business Rules"
                  >
                    <Settings size={13} />
                    <span>Policy &amp; Rules</span>
                  </button>

                  {/* Manual Student Lead Addition */}
                  <button
                    className="btn-pulse"
                    onClick={() => setShowManualLeadModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <UserPlus size={13} />
                    <span>+ Add Student</span>
                  </button>
                </div>
              </div>

              {/* Master Leads Table */}
              <div className="template-card">
                <div className="template-card-header">
                  <h3>Master Ingested Leads List</h3>
                  <span className="header-badge">
                    {pageSize === 'all'
                      ? `All ${masterLeads.length} Leads Shown`
                      : `Page ${page} of ${totalPages} (${totalLeadsCount} total leads)`}
                  </span>
                </div>
                {selectEntireMaster && totalLeadsCount > 0 && (
                  <div
                    style={{
                      padding: '8px 16px',
                      background: '#fef2f2',
                      borderBottom: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: '#991b1b',
                    }}
                  >
                    <span>
                      <strong>All {totalLeadsCount} matching leads</strong> across all {totalPages} page(s) are selected.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectEntireMaster(false)
                        setSelectedMasterLeadIds([])
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
                <div className="template-card-body" style={{ padding: 0 }}>
                  {loading ? (
                    <div className="data-loader-container">
                      <div className="data-loader-spinner" />
                      <div className="data-loader-text">Loading {pageSize === 'all' ? 'all' : `Page ${page}`} leads...</div>
                      <div className="data-loader-sub">Querying  database</div>
                    </div>
                  ) : masterLeads.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                      <Search size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>No leads match the selected filters</p>
                    </div>
                  ) : (
                    <div className="leads-table-container">
                      <table className="leads-table">
                        <thead>
                          <tr>
                            <th style={{ width: 38 }}>
                              <input
                                type="checkbox"
                                checked={
                                  selectEntireMaster ||
                                  (masterLeads.length > 0 &&
                                    masterLeads.every(l => selectedMasterLeadIds.includes(l.id)))
                                }
                                onChange={toggleSelectAllMasterLeads}
                              />
                            </th>
                            <th>Lead ID</th>
                            <th>Candidate & Contacts</th>
                            <th>Course Enquired</th>
                            <th>Time of Arrival</th>
                            <th>Qualification / City</th>
                            <th>Assignment State</th>
                            <th>Contact Status</th>
                            <th>Attempts & Sub-status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterLeads.map(lead => {
                            const isAssigned = lead.assignmentStatus === 'ASSIGNED'
                            const isMasterSelected = selectEntireMaster || selectedMasterLeadIds.includes(lead.id)
                            return (
                              <tr
                                key={lead.id}
                                style={{ background: isMasterSelected ? '#fef2f2' : 'transparent' }}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isMasterSelected}
                                    onChange={() => toggleSelectMasterLead(lead.id)}
                                  />
                                </td>
                                <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                                  #{lead.metaLeadId ? lead.metaLeadId.slice(-6) : lead.id?.slice(-6)}
                                </td>
                                <td>
                                  <div
                                    style={{ fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                                    onClick={() => setActiveLeadModal(lead)}
                                  >
                                    {lead.fullName}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#475569' }}>{lead.phone}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{lead.email}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                                    {lead.courseProgram || lead.businessProgramName || 'Not Specified'}
                                  </div>
                                  {(lead.courseVariant || lead.businessProgramVariant) && (
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      {lead.courseVariant || lead.businessProgramVariant}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                                    <Clock size={13} color="#0284c7" />
                                    <span>{formatArrivalTime(lead.createdTime || lead.createdAt)}</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                    {lead.createdTime ? new Date(lead.createdTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{lead.qualification}</div>
                                  <div style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={11} color="#64748b" />
                                    <span>{lead.preferredLocation}</span>
                                  </div>
                                </td>
                                <td>
                                  {isAssigned ? (
                                    <div>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <UserCheck size={13} /> {lead.assignedTo?.repName || 'Assigned'}
                                      </span>
                                      {lead.initialAdvisor?.repName &&
                                        lead.initialAdvisor.repName !== lead.assignedTo?.repName && (
                                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                            Initial: <strong>{lead.initialAdvisor.repName}</strong>
                                          </div>
                                        )}
                                      <button
                                        onClick={() => handleUnassign([lead.id])}
                                        style={{ fontSize: 10, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                      >
                                        Return to Pool
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: 4 }}>
                                        In Pool (Unassigned)
                                      </span>
                                      {lead.initialAdvisor?.repName && (
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                          Initial: <strong>{lead.initialAdvisor.repName}</strong>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {(() => {
                                    const stVal = lead.leadStatus || 'NEW LEAD'
                                    const sb = getStatusBadgeStyle(stVal)
                                    const hb = lead.heatTier ? getHeatBadgeStyle(lead.heatTier) : null
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            background: sb.bg,
                                            color: sb.color,
                                            border: `1px solid ${sb.border}`,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {stVal}
                                        </span>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                          {hb && (
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '1px 6px',
                                                borderRadius: 10,
                                                background: hb.bg,
                                                color: hb.color,
                                              }}
                                            >
                                              {hb.label}
                                            </span>
                                          )}
                                          {lead.isCycleEnded && (
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#1e293b', color: '#fff' }}>
                                              End
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </td>
                                <td>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                                    {lead.selectedCategoryLabel || lead.subStatus}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>
                                    Cycle #{lead.cycleNumber || 1} • Steps: {lead.steps?.length || 0} • Calls: {lead.callAttempts || 0}
                                    {lead.callbackAt && ' • Callback'}
                                  </div>
                                  {lead.lostReason && lead.leadStatus === 'LOST' && (
                                    <div style={{ fontSize: 10, color: '#991b1b', fontWeight: 600 }}>
                                      Lost: {lead.lostReason} ({lead.lostCycleCount || 1}/{crmMeta?.policy?.maxLostCycles || 3})
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      className="btn-pulse"
                                      onClick={() => setActiveStepLead(lead)}
                                      style={{ padding: '3px 8px', fontSize: 11 }}
                                      title="Add lifecycle step, update status, or view timeline"
                                    >
                                      + Step
                                    </button>
                                    <button
                                      className="btn-action-sm"
                                      onClick={() => setActiveLeadModal(lead)}
                                    >
                                      Profile
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLead(lead)}
                                      disabled={deletingLeads}
                                      title={isAssigned ? 'Remove assigned lead' : 'Remove lead from pool'}
                                      style={{
                                        padding: '3px 7px',
                                        borderRadius: 4,
                                        border: '1px solid #fecaca',
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        cursor: deletingLeads ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Bar or All Leads Indicator */}
                  {pageSize === 'all' ? (
                    <div className="pagination-container" style={{ justifyContent: 'center' }}>
                      <div style={{ fontSize: 13, color: '#475569' }}>
                        Showing all <strong>{masterLeads.length}</strong> leads in master directory (Full list displayed).
                      </div>
                    </div>
                  ) : (
                    <div className="pagination-container">
                      <div>
                        Showing{' '}
                        <strong>
                          {totalLeadsCount === 0 ? 0 : (page - 1) * parseInt(pageSize) + 1} -{' '}
                          {Math.min(page * parseInt(pageSize), totalLeadsCount)}
                        </strong>{' '}
                        of <strong>{totalLeadsCount}</strong> total leads (Page {page} of {totalPages})
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="btn-pagination"
                          onClick={() => setPage(p => Math.max(p - 1, 1))}
                          disabled={page <= 1 || loading}
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            className={`btn-pagination ${page === p ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                            disabled={loading}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          className="btn-pagination"
                          onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                          disabled={page >= totalPages || loading}
                        >
                          <span>Next</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DISCOUNT APPROVALS */}
          {activeTab === 'discount-approvals' && (
            <DiscountApprovalsView
              onCountsChanged={setPendingDiscountCount}
              showNotify={showNotify}
            />
          )}

          {/* ========================================================
              TAB 4: REPORTS HUB (CARDS -> DEDICATED PAGE FOR EACH REPORT)
              ======================================================== */}
          {activeTab === 'reports' && (
            !reportSlug ? (
              <div>
                <div
                  className="pool-action-bar"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Management Reports &amp; Analytics Hub
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Select any report card below to open its dedicated full-page view with filters &amp; CSV export.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-pulse"
                    onClick={() => openSettingsModal('programs')}
                    style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <IndianRupee size={14} />
                    <span>Course &amp; Fee Structure</span>
                  </button>
                </div>

                {/* Report Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: 16,
                  }}
                >
                  {[
                    {
                      slug: 'business',
                      title: 'Business Report (FRD 7.1)',
                      desc: 'Per-user Leads Allocated, Unique Aggregate Business Count, Turnover (Course Fees), Sales Revenue (Paid), and Qualified / Converted / Onboarded splits.',
                      color: '#059669',
                      bg: '#ecfdf5',
                      badge: 'Turnover & Revenue',
                      Icon: IndianRupee,
                    },
                    {
                      slug: 'conversion',
                      title: 'Lead Conversion Report (FRD 7.2)',
                      desc: 'Compare assigned lead cohorts with Aggregate, Qualified, Converted, and Onboarded counts & conversion percentages across Current Month or Till Date.',
                      color: '#0284c7',
                      bg: '#f0f9ff',
                      badge: 'Cohort Ratios',
                      Icon: TrendingUp,
                    },
                    {
                      slug: 'status',
                      title: 'Lead Status Report (FRD 7.3)',
                      desc: 'Distribution of assigned leads across HOT, WARM, COLD, LOST, NON-CONNECT, NON PROSPECT & Other statuses with 100% reconciled percentages.',
                      color: '#dc2626',
                      bg: '#fef2f2',
                      badge: 'Admin Only',
                      Icon: BarChart3,
                    },
                    {
                      slug: 'schedule',
                      title: 'Follow-Up & Next Contact Schedule',
                      desc: 'See all sales counselors\' daily, next-day, custom-date, and overdue follow-up schedules — track who needs to contact whom with CSV export.',
                      color: '#0284c7',
                      bg: '#f0f9ff',
                      badge: 'Daily Schedule',
                      Icon: Calendar,
                    },
                    {
                      slug: 'heat',
                      title: 'Hot / Warm / Cold Classification',
                      desc: 'Visual Donut chart, category breakdown, and backend-paginated searchable leads table classified by Heat Tier.',
                      color: '#ea580c',
                      bg: '#fff7ed',
                      badge: 'Admin Only',
                      Icon: Flame,
                    },
                    {
                      slug: 'groups',
                      title: 'Group-Wise Performance Report',
                      desc: 'Compare Counselor Groups & Teams by lead volume, Hot/Warm/Cold split, milestone conversions, course fees, and collections.',
                      color: '#4f46e5',
                      bg: '#eef2ff',
                      badge: 'Team Analytics',
                      Icon: Building2,
                    },
                    {
                      slug: 'lifecycle',
                      title: '10-Status Lifecycle Funnel',
                      desc: 'End-to-end visual funnel across all 10 canonical lead lifecycle statuses with active vs end-of-cycle counts.',
                      color: '#0e7490',
                      bg: '#ecfeff',
                      badge: 'Funnel View',
                      Icon: Activity,
                    },
                    {
                      slug: 'recycle',
                      title: 'Lost Business & Recycle Queue',
                      desc: 'Lost reason breakdown plus separate Recyclable Lost & Max-Limit Lost tables with single, selected, or entire-list Recycle & Remove.',
                      color: '#991b1b',
                      bg: '#fef2f2',
                      badge: 'Recycle Ops',
                      Icon: RotateCcw,
                    },
                    {
                      slug: 'finance',
                      title: 'Program & Milestone Financials',
                      desc: 'Total Course Fees (Business Value) vs Actual Collected vs Pending Balance broken down by Business Milestone and Course Program.',
                      color: '#15803d',
                      bg: '#f0fdf4',
                      badge: 'Finance',
                      Icon: PieChart,
                    },
                    {
                      slug: 'counselors',
                      title: 'Counselor Performance Matrix',
                      desc: 'Complete advisor-by-advisor performance table including disabled/archived counselors, steps logged, and revenue collection.',
                      color: '#1b2b6b',
                      bg: '#eff6ff',
                      badge: 'Staff Matrix',
                      Icon: Users,
                    },
                    {
                      slug: 'stage',
                      title: 'Pipeline Stage & Sub-Status Report',
                      desc: 'Success status summary cards and granular stage/sub-status distribution with average call attempts.',
                      color: '#7c3aed',
                      bg: '#f5f3ff',
                      badge: 'Pipeline',
                      Icon: Layers,
                    },
                    {
                      slug: 'demographics',
                      title: 'Campaigns, Channels & Demographics',
                      desc: 'Meta campaign attribution, Instagram vs Facebook split, Preferred Work City / Kerala districts, and Qualification demographics.',
                      color: '#0369a1',
                      bg: '#f0f9ff',
                      badge: 'Audience & ROI',
                      Icon: Globe,
                    },
                    {
                      slug: 'discounts',
                      title: 'Discount Report (Agreed vs Standard Fee)',
                      desc: 'Track monthly discounts given by Sales Rep, Group & Group Manager, and who authorized each discount across Qualified, Converted, and Onboarded leads.',
                      color: '#be185d',
                      bg: '#fdf2f8',
                      badge: 'Discounts',
                      Icon: Tag,
                    },
                    {
                      slug: 'response-sla',
                      title: 'Round-Robin to First Contact SLA',
                      desc: 'Track Sales Rep response times by IST priority windows: 9 AM–5 PM (P1), 5 PM–8 PM (P2), Sunday Holiday (Relaxed), Other Hours & Paused Dates.',
                      color: '#0284c7',
                      bg: '#f0f9ff',
                      badge: 'Response SLA',
                      Icon: Clock,
                    },
                    {
                      slug: 'referrals',
                      title: 'Referral Intelligence & Demographics',
                      desc: 'Track student, alumni, and lead referral sources, demographic breakdowns by course and date, leaderboard, and conversion revenue.',
                      color: '#0284c7',
                      bg: '#f0f9ff',
                      badge: 'Referrals & Demographics',
                      Icon: Share2,
                    },
                  ].map(card => {
                    const CardIcon = card.Icon
                    return (
                      <div
                        key={card.slug}
                        className="template-card"
                        onClick={() => navigate(`/reports/${card.slug}`)}
                        style={{
                          padding: 18,
                          cursor: 'pointer',
                          borderTop: `3px solid ${card.color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: card.bg,
                                color: card.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CardIcon size={19} />
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 12,
                                background: card.bg,
                                color: card.color,
                              }}
                            >
                              {card.badge}
                            </span>
                          </div>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                            {card.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                            {card.desc}
                          </p>
                        </div>
                        <div
                          style={{
                            paddingTop: 10,
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            fontWeight: 700,
                            color: card.color,
                          }}
                        >
                          <span>Open Report Page</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : reportSlug === 'schedule' ? (
              <FollowupScheduleView
                isAdmin={true}
                salesReps={salesReps}
                currentUser={user}
                refreshKey={scheduleRefreshKey}
                onBack={() => navigate('/reports')}
                onOpenStep={lead => setActiveStepLead(lead)}
                onOpenProfile={lead => setActiveLeadModal(lead)}
                showNotify={showNotify}
              />
            ) : reportSlug === 'discounts' ? (
              <DiscountReportView
                isManagerScoped={false}
                onBack={() => navigate('/reports')}
                showNotify={showNotify}
              />
            ) : reportSlug === 'response-sla' ? (
              <ResponseSlaReportView
                isManagerScoped={false}
                onBack={() => navigate('/reports')}
                showNotify={showNotify}
              />
            ) : reportSlug === 'referrals' ? (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => navigate('/reports')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 0,
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Reports Hub</span>
                  </button>
                </div>
                <ReferralDashboard
                  onOpenLeadProfile={async leadId => {
                    try {
                      const res = await api.getLeadById(leadId)
                      if (res.lead) setActiveLeadModal(res.lead)
                    } catch (err) {
                      showNotify('error', 'Could not open lead profile')
                    }
                  }}
                  showNotify={showNotify}
                />
              </div>
            ) : ['business', 'conversion', 'status'].includes(reportSlug) ? (
              <FrdReportsView
                reportType={reportSlug}
                isAdmin={true}
                onBack={() => navigate('/reports')}
                showNotify={showNotify}
              />
            ) : ['heat', 'groups', 'lifecycle', 'recycle', 'finance', 'counselors'].includes(reportSlug) ? (
              <AdminAdvancedReports
                salesReps={salesReps}
                forcedSubTab={reportSlug}
                onBack={() => navigate('/reports')}
                onOpenSettings={() => openSettingsModal('policy')}
                onInspectLeadById={openStepModalById}
                onRefreshParent={() => {
                  loadOverviewData()
                  if (activeTab === 'all-leads') loadMasterLeads(page, pageSize)
                }}
                showNotify={showNotify}
              />
            ) : reportSlug === 'stage' ? (
              <div>
                <div className="pool-action-bar" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    className="btn-pulse-secondary"
                    onClick={() => navigate('/reports')}
                    style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <ArrowLeft size={14} />
                    <span>All Reports</span>
                  </button>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    Current Success Status &amp; Pipeline Stage Report
                  </h3>
                </div>
                <div className="stage-report-grid">
                  {stats?.successStatusReport?.map((st, i) => (
                    <div key={i} className="stage-stat-card" style={{ borderLeft: `4px solid ${st.color}` }}>
                      <div className="stage-stat-title">{st.status}</div>
                      <div className="stage-stat-value" style={{ color: st.color }}>{st.count}</div>
                      <div className="stage-stat-sub">{st.percentage}% of all assigned leads</div>
                    </div>
                  ))}
                </div>
                <div className="template-card">
                  <div className="template-card-header">
                    <h3>Current Lead Pipeline Stage &amp; Sub-Status Breakdown</h3>
                    <span className="header-badge">{stats?.stageReport?.length || 0} Active Stages</span>
                  </div>
                  <div className="template-card-body" style={{ padding: 0 }}>
                    <table className="reps-table">
                      <thead>
                        <tr>
                          <th>Current Stage / Sub-Status</th>
                          <th>Category</th>
                          <th>Lead Volume</th>
                          <th>Pipeline Share (%)</th>
                          <th>Average Attempts</th>
                          <th>Progress Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.stageReport && stats.stageReport.length > 0 ? (
                          stats.stageReport.map((stage, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                  <strong style={{ color: '#1e293b' }}>{stage.stage}</strong>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, color: '#475569', fontWeight: 600 }}>
                                  {stage.category}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700, fontSize: 14 }}>{stage.count}</td>
                              <td><strong style={{ color: stage.color }}>{stage.percentage}%</strong></td>
                              <td style={{ color: '#64748b' }}>{stage.avgAttempts} calls</td>
                              <td style={{ width: 160 }}>
                                <div style={{ width: '100%', height: 7, background: '#e2e8f0', borderRadius: 4 }}>
                                  <div style={{ width: `${Math.min(stage.percentage * 2, 100)}%`, height: '100%', background: stage.color, borderRadius: 4 }} />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No stages recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Campaigns, Channels & Demographics Dedicated Page */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="pool-action-bar">
                  <button
                    type="button"
                    className="btn-pulse-secondary"
                    onClick={() => navigate('/reports')}
                    style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <ArrowLeft size={14} />
                    <span>All Reports</span>
                  </button>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    Campaigns, Channels &amp; Demographics Report
                  </h3>
                </div>
                <div className="grid-2-col">
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Meta Campaign Performance</h3>
                      <span className="header-badge">Lead Attribution</span>
                    </div>
                    <div className="template-card-body">
                      <div className="progress-list">
                        {stats?.campaignReport?.map((c, i) => (
                          <div key={i} className="progress-item-row" style={{ alignItems: 'flex-start' }}>
                            <div style={{ width: '45%' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }} title={c.name}>{c.name.slice(0, 32)}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{c.total} Total Leads</div>
                            </div>
                            <div className="progress-bar-track" style={{ marginTop: 6 }}>
                              <div className="progress-bar-fill" style={{ width: `${Math.min(c.contactRate, 100)}%` }} />
                            </div>
                            <span className="progress-percentage">{c.contactRate}% Contacted</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Platform Split (Instagram vs Facebook)</h3>
                      <span className="header-badge">Source Platform</span>
                    </div>
                    <div className="template-card-body">
                      {stats?.platformReport?.map((p, i) => (
                        <div key={i} className="progress-item-row">
                          <span className="progress-country-name">{p.name}</span>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${p.percentage}%`, background: p.name === 'Instagram' ? '#e1306c' : '#1877f2' }} />
                          </div>
                          <span className="progress-percentage">{p.count} leads ({p.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid-2-col">
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Preferred Work City / Placement</h3>
                      <span className="header-badge">Kerala vs Abroad</span>
                    </div>
                    <div className="template-card-body">
                      <div className="progress-list">
                        {stats?.locationReport?.map((loc, i) => (
                          <div key={i} className="progress-item-row">
                            <span className="progress-country-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <MapPin size={12} color="#0284c7" />
                              <span>{loc.name}</span>
                            </span>
                            <div className="progress-bar-track">
                              <div className="progress-bar-fill" style={{ width: `${loc.percentage}%`, background: '#0284c7' }} />
                            </div>
                            <span className="progress-percentage">{loc.count} ({loc.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="template-card">
                    <div className="template-card-header">
                      <h3>Qualification Demographics</h3>
                      <span className="header-badge">Highest Education</span>
                    </div>
                    <div className="template-card-body">
                      {stats?.qualificationReport?.map((q, i) => (
                        <div key={i} className="progress-item-row">
                          <span className="progress-country-name">{q.name}</span>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${q.percentage}%`, background: '#8b5cf6' }} />
                          </div>
                          <span className="progress-percentage">{q.count} leads ({q.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================
              TAB 5: USER MANAGEMENT (SALES ADVISORS & ADMINS)
              ======================================================== */}
          {activeTab === 'users' && (
            <div>
              {/* Metric Cards Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Staff Users
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {usersList.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: 600 }}>
                    {usersList.filter(u => u.active).length} Active Staff Accounts
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Admissions Advisors
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                    {usersList.filter(u => u.role === 'sales' && u.active).length}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Handling lead pool allocations
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Leads Distributed
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                    {usersList.reduce((acc, u) => acc + (u.totalAssigned || 0), 0)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Across active admissions team
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    System Administrators
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                    {usersList.filter(u => u.role === 'admin').length}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Full configuration & audit access
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation: Admissions Counselors vs Counselor Groups */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setGroupSubTab('counselors')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: groupSubTab === 'counselors' ? '#0f172a' : '#e2e8f0',
                    color: groupSubTab === 'counselors' ? '#ffffff' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Users size={15} />
                  <span>Admissions Counselors ({usersList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupSubTab('groups')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: groupSubTab === 'groups' ? '#0f172a' : '#e2e8f0',
                    color: groupSubTab === 'groups' ? '#ffffff' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Layers size={15} />
                  <span>Counselor Groups & Teams ({counselorGroups.length})</span>
                </button>
              </div>

              {/* VIEW 1: COUNSELOR GROUPS & TEAMS */}
              {groupSubTab === 'groups' && (
                <div>
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: 10,
                      padding: '14px 18px',
                      border: '1px solid #e2e8f0',
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                        Admissions Counselor Teams & Groups
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                        Groups allow designated managers to oversee counselor pipelines and route Meta lead forms to entire teams
                      </p>
                    </div>
                    <button
                      className="btn-pulse"
                      onClick={() => {
                        setEditingGroup(null)
                        setShowGroupModal(true)
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <UserPlus size={15} />
                      <span>+ Create Counselor Group</span>
                    </button>
                  </div>

                  {counselorGroups.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <Users size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>No Counselor Groups Created Yet</div>
                      <p style={{ fontSize: 12, color: '#64748b', maxWidth: 400, margin: '6px auto 14px' }}>
                        Create groups to group counselors by program, geography, or shift, and designate team managers.
                      </p>
                      <button
                        className="btn-pulse"
                        onClick={() => {
                          setEditingGroup(null)
                          setShowGroupModal(true)
                        }}
                        style={{ background: '#8b5cf6', padding: '7px 16px', fontSize: 12 }}
                      >
                        + Create First Group
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                      {counselorGroups.map(group => (
                        <div
                          key={group.id || group._id}
                          style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            padding: '16px 18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                                {group.name}
                              </h4>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  background: group.active ? '#dcfce7' : '#f1f5f9',
                                  color: group.active ? '#15803d' : '#64748b',
                                }}
                              >
                                {group.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {group.description && (
                              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#64748b' }}>
                                {group.description}
                              </p>
                            )}

                            {/* Group Manager */}
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                GROUP MANAGER
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <UserCheck size={14} color="#0284c7" />
                                <span>{group.manager?.name || 'No Manager Assigned'}</span>
                              </div>
                              {group.manager?.email && (
                                <div style={{ fontSize: 11, color: '#64748b' }}>{group.manager.email}</div>
                              )}
                            </div>

                            {/* Members */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                                TEAM COUNSELORS ({(group.members || []).length}):
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(group.members || []).map(m => (
                                  <span
                                    key={m._id || m.id}
                                    style={{
                                      fontSize: 11,
                                      background: '#eff6ff',
                                      color: '#1d4ed8',
                                      padding: '3px 8px',
                                      borderRadius: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {m.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Live Pipeline Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{group.stats?.activeCount ?? 0}</div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>Active</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{group.stats?.completedCount ?? 0}</div>
                                <div style={{ fontSize: 10, color: '#10b981' }}>Students</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{group.stats?.droppedCount ?? 0}</div>
                                <div style={{ fontSize: 10, color: '#ef4444' }}>Dropped</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>{group.stats?.totalLeads ?? 0}</div>
                                <div style={{ fontSize: 10, color: '#0284c7' }}>Total</div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                            <button
                              type="button"
                              className="btn-pulse-secondary"
                              onClick={() => {
                                setEditingGroup(group)
                                setShowGroupModal(true)
                              }}
                              style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                              Edit Group
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete group "${group.name}"?`)) {
                                  try {
                                    await api.deleteGroup(group.id || group._id)
                                    showNotify('success', `Deleted group "${group.name}"`)
                                    loadCounselorGroups()
                                    loadUsers()
                                  } catch (err) {
                                    showNotify('error', err.message || 'Failed to delete group')
                                  }
                                }
                              }}
                              style={{
                                fontSize: 11,
                                padding: '4px 10px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: STAFF & ADMISSIONS COUNSELORS DIRECTORY */}
              {groupSubTab === 'counselors' && (
                <div>
                  {/* Action Toolbar */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: 10,
                      padding: '12px 18px',
                      border: '1px solid #e2e8f0',
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                      {/* Search input */}
                      <div style={{ position: 'relative', minWidth: 220, maxWidth: 320, width: '100%' }}>
                        <Search
                          size={14}
                          color="#94a3b8"
                          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type="text"
                          placeholder="Search advisor by name, email, territory..."
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 12px 7px 32px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Role filter */}
                      <select
                        value={userRoleFilter}
                        onChange={e => {
                          setUserRoleFilter(e.target.value)
                          setUsersPage(1)
                        }}
                        style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="all">All Roles</option>
                        <option value="sales">Sales Advisors Only</option>
                        <option value="admin">Administrators Only</option>
                      </select>

                      {/* Show / Hide Disabled / Old Sales Reps Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisabledUsers(prev => !prev)
                          setUsersPage(1)
                        }}
                        className={showDisabledUsers ? 'btn-pulse' : 'btn-pulse-secondary'}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: showDisabledUsers ? '1px solid #991b1b' : '1px solid #cbd5e1',
                          background: showDisabledUsers ? '#991b1b' : '#f8fafc',
                          color: showDisabledUsers ? '#ffffff' : '#334155',
                          fontWeight: 700,
                        }}
                        title="Toggle between Active Staff and Disabled / Old Sales Reps archive"
                      >
                        <UserX size={14} />
                        <span>
                          {showDisabledUsers
                            ? `Showing Disabled / Old Sales Reps (${disabledUsersCount}) — Back to Active`
                            : `Show Disabled / Old Sales Reps (${disabledUsersCount})`}
                        </span>
                      </button>
                    </div>

                    {/* Telegram Settings + Primary Add Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-pulse-secondary"
                        onClick={() => openSettingsModal('telegram')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 13px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0369a1',
                          borderColor: '#bae6fd',
                          background: '#f0f9ff',
                        }}
                        title="Configure global Telegram alerts & customize notification message templates"
                      >
                        <Send size={14} />
                        <span>Telegram Alerts &amp; Templates</span>
                      </button>

                      <button
                        className="btn-pulse"
                        onClick={handleOpenCreateUser}
                        style={{
                          background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <UserPlus size={15} />
                        <span>Add New Advisor / User</span>
                      </button>
                    </div>
                  </div>

                  {/* Users Directory Card */}
                  <div className="template-card" style={showDisabledUsers ? { borderTop: '3px solid #991b1b' } : undefined}>
                    <div className="template-card-header">
                      <h3>
                        {showDisabledUsers
                          ? 'Disabled / Old Sales Reps & Staff Archive (Click any rep to inspect allocated leads & activity)'
                          : 'Active Staff & Admissions Advisors Directory'}
                      </h3>
                      <span className="header-badge">
                        {usersTotalCount} {showDisabledUsers ? 'Disabled' : 'Active'} Staff Member(s)
                      </span>
                    </div>
                    {showDisabledUsers && (
                      <div
                        style={{
                          padding: '9px 16px',
                          background: '#fef2f2',
                          borderBottom: '1px solid #fecaca',
                          fontSize: 12,
                          color: '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          Disabled staff cannot log in and do not receive new leads. All historical leads retain their <strong>Initial Advisor</strong> record — click any staff row below to inspect their full allocated leads &amp; activity timeline.
                        </span>
                      </div>
                    )}
                    <div className="template-card-body" style={{ padding: 0 }}>
                      {usersLoading ? (
                        <div className="data-loader-container">
                          <div className="data-loader-spinner" />
                          <div className="data-loader-text">
                            Loading {showDisabledUsers ? 'Disabled / Old Sales Reps' : 'Active Staff'}...
                          </div>
                          <div className="data-loader-sub">Querying Database</div>
                        </div>
                      ) : usersList.length === 0 ? (
                        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                          <UserCog size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                          <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                            {showDisabledUsers
                              ? 'No disabled / old sales reps found'
                              : 'No active staff members match this filter'}
                          </p>
                          {!showDisabledUsers && (
                            <button
                              className="btn-pulse"
                              onClick={handleOpenCreateUser}
                              style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <UserPlus size={14} />
                              <span>Add New Advisor</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="leads-table-container">
                          <table className="leads-table">
                            <thead>
                              <tr>
                                <th>Staff Member</th>
                                <th>Role &amp; Title</th>
                                <th>Specialty / Territory</th>
                                <th>{showDisabledUsers ? 'Historical Allocated Leads' : 'Lead Load & Contact Rate'}</th>
                                <th>Telegram Alerts</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersList.map(u => (
                                <tr
                                  key={u.id}
                                  onClick={() => u.role === 'sales' && setHistoryUserId(u.id)}
                                  style={{ cursor: u.role === 'sales' ? 'pointer' : 'default' }}
                                  title={u.role === 'sales' ? 'Click to open allocated leads history & activity panel' : undefined}
                                >
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span
                                        className="rep-avatar"
                                        style={{
                                          background: !u.active ? '#e2e8f0' : u.role === 'admin' ? '#ede9fe' : '#e0f2fe',
                                          color: !u.active ? '#475569' : u.role === 'admin' ? '#6d28d9' : '#0369a1',
                                        }}
                                      >
                                        {u.avatar || 'SR'}
                                      </span>
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                                          {u.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                                        {!u.active && u.disabledAt && (
                                          <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>
                                            Disabled: {new Date(u.disabledAt).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: 12,
                                        background: u.role === 'admin' ? '#ede9fe' : '#dcfce7',
                                        color: u.role === 'admin' ? '#6d28d9' : '#15803d',
                                        display: 'inline-block',
                                        marginBottom: 3,
                                      }}
                                    >
                                      {u.role === 'admin' ? 'Administrator' : 'Sales Advisor'}
                                    </span>
                                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                                      {u.title}
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={11} color="#64748b" />
                                        <span>{u.specialty}</span>
                                      </span>
                                    </span>
                                  </td>
                                  <td>
                                    {u.role === 'sales' ? (
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f172a', flexWrap: 'wrap' }}>
                                          <span>{u.historicalLeadsCount ?? u.totalAssigned ?? 0} Total History</span>
                                          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                                            ({u.totalAssigned || 0} Assigned)
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                          Initial Advisor on <strong>{u.initialAdvisorCount || 0}</strong> • Contacted: {u.contactRate || 0}%
                                        </div>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>
                                        Full System Admin Access
                                      </span>
                                    )}
                                  </td>
                                  <td onClick={e => e.stopPropagation()}>
                                    {u.telegramChatId ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                        <button
                                          type="button"
                                          disabled={togglingTelegramUserId === u.id || !u.active}
                                          onClick={e => handleToggleUserTelegram(e, u)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '3px 9px',
                                            borderRadius: 12,
                                            border: `1px solid ${u.telegramNotificationsEnabled ? '#7dd3fc' : '#cbd5e1'}`,
                                            background: u.telegramNotificationsEnabled ? '#e0f2fe' : '#f1f5f9',
                                            color: u.telegramNotificationsEnabled ? '#0369a1' : '#64748b',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: u.active ? 'pointer' : 'not-allowed',
                                          }}
                                          title="Click to enable or disable Telegram notifications for this user"
                                        >
                                          <Send size={11} />
                                          <span>
                                            {togglingTelegramUserId === u.id
                                              ? 'Saving...'
                                              : u.telegramNotificationsEnabled
                                                ? 'Enabled'
                                                : 'Disabled'}
                                          </span>
                                        </button>
                                        <span style={{ fontSize: 10, color: '#64748b' }}>
                                          Chat ID: {u.telegramChatId}
                                        </span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleOpenEditUser(u)
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '3px 8px',
                                          borderRadius: 10,
                                          border: '1px dashed #cbd5e1',
                                          background: '#f8fafc',
                                          color: '#64748b',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                        title="Set Telegram Chat ID to enable alerts for this user"
                                      >
                                        <Send size={11} />
                                        <span>Setup Chat ID</span>
                                      </button>
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                      <span
                                        style={{
                                          background: u.active ? '#dcfce7' : '#fee2e2',
                                          color: u.active ? '#15803d' : '#991b1b',
                                          fontWeight: 700,
                                          fontSize: 11,
                                          padding: '3px 9px',
                                          borderRadius: 12,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: u.active ? '#16a34a' : '#dc2626',
                                          }}
                                        />
                                        <span>{u.active ? 'Active' : 'Disabled'}</span>
                                      </span>
                                      {u.active && u.isPaused && (
                                        <span
                                          style={{
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            fontWeight: 700,
                                            fontSize: 10,
                                            padding: '2px 7px',
                                            borderRadius: 10,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: '1px solid #fde68a',
                                          }}
                                          title={u.pauseReason ? `Reason: ${u.pauseReason}` : 'Paused from allocation'}
                                        >
                                          <Pause size={10} />
                                          <span>
                                            {u.pauseEndDate
                                              ? `Paused until ${new Date(u.pauseEndDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
                                              : 'Paused'}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                                      {u.role === 'sales' && (
                                        <button
                                          type="button"
                                          className="btn-pulse-secondary"
                                          onClick={() => setHistoryUserId(u.id)}
                                          style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
                                          title="View allocated leads history & activity"
                                        >
                                          <History size={12} />
                                          <span>Leads &amp; Activity</span>
                                        </button>
                                      )}
                                      {u.active ? (
                                        <>
                                          <button
                                            type="button"
                                            className="btn-pulse-secondary"
                                            onClick={() => handleOpenEditUser(u)}
                                            style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            title="Edit user profile & territory"
                                          >
                                            <Edit2 size={12} />
                                            <span>Edit</span>
                                          </button>
                                          {u.role !== 'admin' && (
                                            <>
                                              <button
                                                type="button"
                                                className="btn-pulse-secondary"
                                                onClick={() => handleOpenPauseUser(u)}
                                                style={{
                                                  fontSize: 11,
                                                  padding: '4px 9px',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  background: u.isPaused ? '#fef3c7' : '#f8fafc',
                                                  color: u.isPaused ? '#b45309' : '#334155',
                                                  borderColor: u.isPaused ? '#fde68a' : '#cbd5e1',
                                                }}
                                                title={u.isPaused ? 'Resume counselor round-robin allocation' : 'Pause counselor from receiving round-robin leads'}
                                              >
                                                {u.isPaused ? <Play size={12} /> : <Pause size={12} />}
                                                <span>{u.isPaused ? 'Resume' : 'Pause'}</span>
                                              </button>
                                              <button
                                                type="button"
                                                className="btn-pulse-danger"
                                                onClick={() => handleOpenDisableUser(u)}
                                                style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                title="Disable account login without deleting any lead data"
                                              >
                                                <UserX size={12} />
                                                <span>Disable</span>
                                              </button>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn-pulse"
                                          onClick={() => handleReEnableUser(u)}
                                          style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#059669' }}
                                          title="Re-enable account login"
                                        >
                                          <RotateCcw size={12} />
                                          <span>Re-Enable</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {usersTotalCount > 0 && (
                        <div className="pagination-container">
                          <div>
                            Showing{' '}
                            <strong>
                              {(usersPage - 1) * usersPageSize + 1} - {Math.min(usersPage * usersPageSize, usersTotalCount)}
                            </strong>{' '}
                            of <strong>{usersTotalCount}</strong> staff users (Page {usersPage} of {usersTotalPages})
                          </div>
                          <div className="pagination-controls">
                            <button
                              type="button"
                              className="btn-pagination"
                              disabled={usersPage <= 1 || usersLoading}
                              onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            >
                              <ChevronLeft size={14} />
                              <span>Previous</span>
                            </button>
                            <button
                              type="button"
                              className="btn-pagination"
                              disabled={usersPage >= usersTotalPages || usersLoading}
                              onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                            >
                              <span>Next</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL: FILE UPLOAD (XLSX, XLS, CSV, TSV)
          Triggered from Pool tab only
          ======================================================== */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ position: 'relative' }}>
            {uploading && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Extracting & Normalizing Leads...</div>
                <div className="data-loader-sub">Parsing Meta columns, Malayalam cities & saving to DB</div>
              </div>
            )}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Import Meta Lead Ads File</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setIsDragging(false)
                }}
                disabled={uploading}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                Upload any Facebook/Instagram lead export file. Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, and <strong>.tsv</strong> formats.
              </p>

              <label
                className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(false)
                  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0])
                  }
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <div className="upload-icon-circle">
                  <Upload size={28} color="#0284c7" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>
                  {uploading ? 'Processing & Extracting Leads...' : isDragging ? 'Drop file to upload' : 'Click to select or drag & drop file'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Meta Lead Ads CSV, Excel (.xlsx/.xls) or Tab-separated (.tsv)
                </div>
              </label>

              <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Auto-Extraction Capabilities:</div>
                <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Extracts candidate full name, phone number, email.</li>
                  <li>Normalizes phone numbers, stripping prefixes like <code>p:</code>.</li>
                  <li>Extracts educational qualification, preferred work city (supports Malayalam questions), and learning mode.</li>
                  <li>Deduplicates leads automatically by phone and email in DB.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-pulse-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setIsDragging(false)
                }}
                disabled={uploading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PASTE RAW META TEXT (TSV / CSV)
          Triggered from Pool tab only
          ======================================================== */}
      {showPasteModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ position: 'relative' }}>
            {uploading && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Parsing & Ingesting Leads into Database...</div>
                <div className="data-loader-sub">Extracting fields & deduplicating phone numbers</div>
              </div>
            )}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardPaste size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Paste Meta Lead Form Data</h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                disabled={uploading}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                Paste raw tab-separated or comma-separated lines directly from Meta Ads Manager or Google Sheets:
              </p>
              <textarea
                rows={10}
                placeholder="id&#9;created_time&#9;ad_id&#9;full_name&#9;phone_number&#9;email..."
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  background: '#f8fafc',
                }}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-pulse-secondary"
                onClick={() => setShowPasteModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                className="btn-pulse-accent"
                onClick={handlePasteSubmit}
                disabled={uploading || !pasteContent.trim()}
              >
                {uploading ? 'Processing...' : 'Parse & Ingest into Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CLEAR LEAD DATABASE
          ======================================================== */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 520, position: 'relative' }}>
            {resetting && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Clearing Lead Database...</div>
                <div className="data-loader-sub">Updating Database Atlas collections</div>
              </div>
            )}
            <div className="modal-header" style={{ background: '#991b1b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Clear Lead Database</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                disabled={resetting}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Wipe All Leads */}
                <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={15} /> Wipe All Leads (Empty Database)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    Deletes all leads in the database (unassigned &amp; assigned). Historical sync will be paused so old submissions are not re-imported.
                  </div>
                  <button
                    className="btn-pulse-danger"
                    onClick={() => handleResetDb('clean')}
                    disabled={resetting}
                  >
                    Wipe All Leads (Set to 0)
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-pulse-secondary"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: STUDENT PROFILE (EDITABLE & STARTS OPEN)
          ======================================================== */}
      {activeLeadModal && (
        <StudentProfileModal
          lead={activeLeadModal}
          counselors={salesReps}
          currentUser={user}
          onClose={() => setActiveLeadModal(null)}
          onUpdated={updatedLead => {
            setActiveLeadModal(updatedLead)
            loadOverviewData()
            setScheduleRefreshKey(k => k + 1)
            if (activeTab === 'all-leads') loadMasterLeads(page, pageSize)
          }}
          showNotify={showNotify}
        />
      )}

      {/* ========================================================
          MODAL: MANUAL STUDENT LEAD CREATION (MANUAL TYPING)
          ======================================================== */}
      <ManualLeadModal
        isOpen={showManualLeadModal}
        onClose={() => setShowManualLeadModal(false)}
        counselors={salesReps}
        groups={counselorGroups}
        currentUser={user}
        onSuccess={() => {
          loadOverviewData()
          if (activeTab === 'all-leads') loadMasterLeads(1, pageSize)
        }}
        showNotify={showNotify}
      />

      {/* ========================================================
          MODAL: COUNSELOR GROUP CREATE / EDIT
          ======================================================== */}
      <CounselorGroupModal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false)
          setEditingGroup(null)
        }}
        group={editingGroup}
        counselors={salesReps}
        onSuccess={() => {
          loadCounselorGroups()
          loadUsers()
        }}
        showNotify={showNotify}
      />

      {/* ========================================================
          MODAL: LEAD STEP & LIFECYCLE PROGRESSION (ADMIN)
          ======================================================== */}
      {activeStepLead && (
        <LeadStepModal
          lead={activeStepLead}
          currentUser={user}
          crmMeta={crmMeta}
          onClose={() => setActiveStepLead(null)}
          onUpdated={updatedLead => {
            setActiveStepLead(null)
            loadOverviewData()
            setScheduleRefreshKey(k => k + 1)
            if (activeTab === 'all-leads') loadMasterLeads(page, pageSize)
          }}
          showNotify={showNotify}
        />
      )}

      {/* ========================================================
          MODAL: CRM LIFECYCLE POLICY, LOST CYCLES & PROGRAM MASTER
          ======================================================== */}
      <AdminLifecycleSettingsModal
        isOpen={showLifecycleSettingsModal}
        initialTab={lifecycleSettingsInitialTab}
        onClose={() => setShowLifecycleSettingsModal(false)}
        onSaved={() => {
          loadCrmMeta()
          loadOverviewData()
        }}
        showNotify={showNotify}
      />
      {/* ========================================================
          MODAL: META GRAPH API LIVE SYNC, FORMS & ALERTS
          ======================================================== */}
      {showMetaModal && (
        <div className="modal-overlay">
          <div className="modal-card meta-modal-card" style={{ position: 'relative' }}>
            {(fetchingMetaForms || syncingMetaLeads || savingMetaForms || savingMetaConfig) && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">
                  {fetchingMetaForms
                    ? 'Connecting to Meta Graph API & Retrieving Forms...'
                    : syncingMetaLeads
                      ? 'Synchronizing Meta Leads & Updating CRM Pool...'
                      : savingMetaForms
                        ? 'Saving Active Form Selection...'
                        : 'Saving Configuration...'}
                </div>
                <div className="data-loader-sub">
                  Graph API v21.0 • Incremental Ingestion & Phone Deduplication
                </div>
              </div>
            )}

            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe size={20} color="#ffffff" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#ffffff' }}>Meta Graph API Lead Sync</h3>
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.85)' }}>
                    Direct Facebook Lead Ads Ingestion, Form Filtering & Real-Time Alerts
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMetaModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                disabled={fetchingMetaForms || syncingMetaLeads}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="meta-sub-tabs">
              <button
                className={`meta-sub-tab-btn ${metaTab === 'forms' ? 'active' : ''}`}
                onClick={() => setMetaTab('forms')}
              >
                <FileSpreadsheet size={15} />
                <span>Select & Save Forms</span>
                {metaForms.filter(f => f.active).length > 0 && (
                  <span className="meta-badge-count" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                    {metaForms.filter(f => f.active).length} Active
                  </span>
                )}
              </button>
              <button
                className={`meta-sub-tab-btn ${metaTab === 'credentials' ? 'active' : ''}`}
                onClick={() => setMetaTab('credentials')}
              >
                <Key size={15} />
                <span>Credentials & Page ID</span>
                {metaConfig?.hasToken && (
                  <span className="meta-badge-count" style={{ background: '#dcfce7', color: '#166534' }}>
                    Connected
                  </span>
                )}
              </button>
              <button
                className={`meta-sub-tab-btn ${metaTab === 'alerts' ? 'active' : ''}`}
                onClick={() => setMetaTab('alerts')}
              >
                <Bell size={15} />
                <span>Real-Time Alerts</span>
                {metaAlerts.soundAlert && (
                  <Volume2 size={13} color="#16a34a" />
                )}
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              {/* ========================================================
                  TAB 1: SELECT & SAVE FORMS
                  ======================================================== */}
              {metaTab === 'forms' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        Tracked Lead Generation Forms
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Choose which Facebook Lead Ads forms should automatically populate the unassigned CRM lead pool.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-pulse-secondary"
                        onClick={handleFetchMetaForms}
                        disabled={fetchingMetaForms || syncingMetaLeads}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        <RefreshCw size={13} className={fetchingMetaForms ? 'spin' : ''} />
                        <span>{fetchingMetaForms ? 'Fetching Campaigns...' : 'Refresh Forms & Campaigns'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-pulse-secondary"
                        onClick={() => handleTriggerMetaSync(true)}
                        disabled={syncingMetaLeads || metaForms.filter(f => f.active).length === 0}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="Re-check all historical leads from active forms and import any missing candidates"
                      >
                        <RotateCcw size={13} />
                        <span>Full Resync (All)</span>
                      </button>
                      <button
                        type="button"
                        className="btn-pulse"
                        onClick={() => handleTriggerMetaSync(false)}
                        disabled={syncingMetaLeads || metaForms.filter(f => f.active).length === 0}
                        style={{
                          background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                          fontSize: 12,
                          padding: '6px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title="Fetch only new leads submitted after the last successful sync"
                      >
                        <Zap size={14} />
                        <span>{syncingMetaLeads ? 'Syncing...' : 'Sync Leads Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync status card */}
                  {metaConfig?.lastSyncAt && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        background: metaConfig.lastSyncStatus === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${metaConfig.lastSyncStatus === 'SUCCESS' ? '#bbf7d0' : '#fecaca'}`,
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: metaConfig.lastSyncStatus === 'SUCCESS' ? '#22c55e' : '#ef4444',
                          }}
                        />
                        <span style={{ color: '#334155' }}>
                          Last Synced: <strong>{new Date(metaConfig.lastSyncAt).toLocaleTimeString()}</strong> •{' '}
                          {metaConfig.lastSyncMessage || 'Sync finished'}
                        </span>
                      </div>
                      <span style={{ color: '#64748b' }}>
                        Background Cron: {metaConfig.autoSync ? 'Active (Every 15m)' : 'Standby (Webhook Mode)'}
                      </span>
                    </div>
                  )}

                  {/* Form Search, Grouping & Select Bar */}
                  {metaForms.length > 0 && (() => {
                    const q = metaFormSearch.trim().toLowerCase()
                    const filteredCount = q
                      ? metaForms.filter(
                          f =>
                            String(f.formName || '').toLowerCase().includes(q) ||
                            String(f.formId || '').toLowerCase().includes(q) ||
                            String(f.campaignName || '').toLowerCase().includes(q) ||
                            String(f.adName || '').toLowerCase().includes(q)
                        ).length
                      : metaForms.length
                    const uniqueCampaignsCount = new Set(
                      metaForms.map(f => (f.campaignName || '').trim()).filter(Boolean)
                    ).size
                    const allGroupKeys = Array.from(
                      new Set(metaForms.map(f => (f.campaignName || '').trim() || '__UNLINKED__'))
                    )
                    const anyExpanded = allGroupKeys.some(k => !collapsedMetaCampaigns[k])

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          {/* Search Input */}
                          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 190 }}>
                            <Search
                              size={14}
                              color="#94a3b8"
                              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            />
                            <input
                              type="text"
                              value={metaFormSearch}
                              onChange={e => setMetaFormSearch(e.target.value)}
                              placeholder="Search campaign, form name, or ID..."
                              style={{
                                width: '100%',
                                padding: '7px 28px 7px 30px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                                outline: 'none',
                                background: '#ffffff',
                                color: '#0f172a',
                              }}
                            />
                            {metaFormSearch && (
                              <button
                                type="button"
                                onClick={() => setMetaFormSearch('')}
                                style={{
                                  position: 'absolute',
                                  right: 6,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  padding: 2,
                                  display: 'inline-flex',
                                }}
                                title="Clear search"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* View Toggle: Grouped by Campaign vs All Forms */}
                          <div
                            style={{
                              display: 'inline-flex',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: 2,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setMetaFormsGroupByCampaign(true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 5,
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: metaFormsGroupByCampaign ? '#ffffff' : 'transparent',
                                color: metaFormsGroupByCampaign ? '#1d4ed8' : '#64748b',
                                boxShadow: metaFormsGroupByCampaign ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                              }}
                            >
                              <Layers size={12} />
                              <span>By Campaign</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetaFormsGroupByCampaign(false)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 5,
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: !metaFormsGroupByCampaign ? '#ffffff' : 'transparent',
                                color: !metaFormsGroupByCampaign ? '#1d4ed8' : '#64748b',
                                boxShadow: !metaFormsGroupByCampaign ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                              }}
                            >
                              <List size={12} />
                              <span>All Forms</span>
                            </button>
                          </div>
                        </div>

                        {/* Summary & Bulk Controls Bar */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: '#475569' }}>
                            Showing <strong>{filteredCount}</strong>
                            {q ? ` of ${metaForms.length}` : ''} forms ({metaForms.filter(f => f.active).length} active)
                            {uniqueCampaignsCount > 0 && (
                              <span>
                                {' '}• <strong>{uniqueCampaignsCount}</strong> campaign{uniqueCampaignsCount === 1 ? '' : 's'} linked
                              </span>
                            )}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {metaFormsGroupByCampaign && allGroupKeys.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = {}
                                    allGroupKeys.forEach(k => {
                                      next[k] = anyExpanded
                                    })
                                    setCollapsedMetaCampaigns(next)
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                                >
                                  {anyExpanded ? 'Collapse All' : 'Expand All'}
                                </button>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectAllForms(true)}
                              style={{ background: 'none', border: 'none', color: '#1877f2', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Select All
                            </button>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForms(false)}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Form Checklist */}
                  {metaForms.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '36px 16px',
                        border: '2px dashed #cbd5e1',
                        borderRadius: 8,
                        background: '#f8fafc',
                      }}
                    >
                      <FileSpreadsheet size={36} color="#94a3b8" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        No Meta Lead Forms Loaded Yet
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', maxWidth: 420, margin: '0 auto 16px', lineHeight: 1.5 }}>
                        Provide your Facebook Page Access Token and Page ID in the Credentials tab, then click below to retrieve your live lead forms.
                      </div>
                      <button
                        className="btn-pulse"
                        onClick={() => {
                          if (!metaConfig?.hasToken && !metaTokenInput) {
                            setMetaTab('credentials')
                          } else {
                            handleFetchMetaForms()
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                          fontSize: 13,
                          padding: '8px 16px',
                        }}
                      >
                        {!metaConfig?.hasToken && !metaTokenInput ? 'Configure Credentials First' : 'Fetch Forms from Meta'}
                      </button>
                    </div>
                  ) : (() => {
                    const q = metaFormSearch.trim().toLowerCase()
                    const visibleForms = q
                      ? metaForms.filter(
                          f =>
                            String(f.formName || '').toLowerCase().includes(q) ||
                            String(f.formId || '').toLowerCase().includes(q) ||
                            String(f.campaignName || '').toLowerCase().includes(q) ||
                            String(f.adName || '').toLowerCase().includes(q)
                        )
                      : metaForms

                    if (visibleForms.length === 0) {
                      return (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '28px 16px',
                            border: '1px dashed #cbd5e1',
                            borderRadius: 8,
                            background: '#f8fafc',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            No matching campaigns or forms found
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                            Try another keyword or clear your search filter.
                          </div>
                          <button
                            type="button"
                            onClick={() => setMetaFormSearch('')}
                            className="btn-pulse-secondary"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                          >
                            Clear Search
                          </button>
                        </div>
                      )
                    }

                    const renderMetaFormRow = (form, showCampaignPill = false) => (
                      <div
                        key={form.formId}
                        className={`meta-form-row ${form.active ? 'selected' : ''}`}
                        onClick={() => handleToggleForm(form.formId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="meta-form-info">
                          <div className="meta-form-title">{form.formName}</div>
                          <div className="meta-form-meta">
                            <span>ID: <code>{form.formId}</code></span>
                            <span className={form.status === 'ACTIVE' ? 'meta-badge-active' : 'meta-badge-archived'}>
                              {form.status || 'ACTIVE'}
                            </span>
                            {form.leadsCount !== undefined && (
                              <span className="meta-badge-count">
                                {form.leadsCount} Meta Submissions
                              </span>
                            )}
                            {showCampaignPill && form.campaignName && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: '#eef2ff',
                                  color: '#4338ca',
                                  fontWeight: 600,
                                  fontSize: 11,
                                }}
                              >
                                <Layers size={11} />
                                <span>{form.campaignName}</span>
                              </span>
                            )}
                            {form.adName && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#64748b',
                                  fontSize: 11,
                                }}
                                title={`Ad: ${form.adName}`}
                              >
                                <Tag size={11} color="#94a3b8" />
                                <span>{form.adName}</span>
                              </span>
                            )}
                            {form.locale && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Globe size={11} color="#64748b" />
                                <span>{form.locale}</span>
                              </span>
                            )}
                          </div>

                          {/* Form Counselor Assignment with Change Button */}
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <span style={{ fontSize: 11, color: '#475569' }}>
                              Assigned to:{' '}
                              <strong style={{ color: '#0369a1' }}>
                                {getAssignedLabel(form)}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setAssigningForm(form)
                              }}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: 4,
                                padding: '2px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Click to choose one, many, or all counselors"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 16 }}>
                          <button
                            type="button"
                            className="btn-pulse-secondary"
                            onClick={e => {
                              e.stopPropagation()
                              handleOpenFormPreview(form.formId, form.formName)
                            }}
                            style={{
                              fontSize: 12,
                              padding: '5px 11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#eff6ff',
                              borderColor: '#bfdbfe',
                              color: '#1d4ed8',
                              fontWeight: 600,
                            }}
                            title="Inspect leads from this form in UI and optionally add to pool"
                          >
                            <Eye size={13} />
                            <span>View Leads</span>
                          </button>

                          <label
                            className="toggle-switch"
                            onClick={e => e.stopPropagation()}
                            title="Toggle active for auto sync"
                          >
                            <input
                              type="checkbox"
                              checked={!!form.active}
                              onChange={() => handleToggleForm(form.formId)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    )

                    if (!metaFormsGroupByCampaign) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {visibleForms.map(form => renderMetaFormRow(form, true))}
                        </div>
                      )
                    }

                    // Group visibleForms by Campaign Name
                    const groupMap = new Map()
                    visibleForms.forEach(form => {
                      const rawCampaign = (form.campaignName || '').trim()
                      const key = rawCampaign || '__UNLINKED__'
                      if (!groupMap.has(key)) {
                        groupMap.set(key, {
                          key,
                          label: rawCampaign || 'Other / No Campaign Linked Yet',
                          isUnlinked: !rawCampaign,
                          campaignStatus: form.campaignStatus || '',
                          forms: [],
                        })
                      }
                      const grp = groupMap.get(key)
                      grp.forms.push(form)
                      if (!grp.campaignStatus && form.campaignStatus) {
                        grp.campaignStatus = form.campaignStatus
                      }
                    })

                    const campaignGroups = Array.from(groupMap.values()).sort((a, b) => {
                      if (a.isUnlinked !== b.isUnlinked) return a.isUnlinked ? 1 : -1
                      const aActive = a.forms.filter(f => f.active).length
                      const bActive = b.forms.filter(f => f.active).length
                      if (aActive !== bActive) return bActive - aActive
                      const aLeads = a.forms.reduce((sum, f) => sum + (Number(f.leadsCount) || 0), 0)
                      const bLeads = b.forms.reduce((sum, f) => sum + (Number(f.leadsCount) || 0), 0)
                      if (aLeads !== bLeads) return bLeads - aLeads
                      return a.label.localeCompare(b.label)
                    })

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {campaignGroups.map(group => {
                          const isCollapsed = !!collapsedMetaCampaigns[group.key]
                          const activeInGroup = group.forms.filter(f => f.active).length
                          const totalLeadsInGroup = group.forms.reduce(
                            (sum, f) => sum + (Number(f.leadsCount) || 0),
                            0
                          )
                          const allGroupActive = activeInGroup === group.forms.length
                          const statusUpper = String(group.campaignStatus || '').toUpperCase()

                          return (
                            <div
                              key={group.key}
                              style={{
                                border: group.isUnlinked ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                                borderRadius: 10,
                                overflow: 'hidden',
                                background: '#ffffff',
                              }}
                            >
                              {/* Campaign Accordion Header */}
                              <div
                                onClick={() => toggleMetaCampaignCollapse(group.key)}
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                  padding: '10px 14px',
                                  background: group.isUnlinked
                                    ? '#f8fafc'
                                    : activeInGroup > 0
                                      ? '#eff6ff'
                                      : '#f8fafc',
                                  borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px' }}>
                                  {isCollapsed ? (
                                    <ChevronRight size={16} color="#475569" style={{ flexShrink: 0 }} />
                                  ) : (
                                    <ChevronDown size={16} color="#475569" style={{ flexShrink: 0 }} />
                                  )}
                                  <Layers
                                    size={15}
                                    color={group.isUnlinked ? '#94a3b8' : '#1d4ed8'}
                                    style={{ flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      color: group.isUnlinked ? '#475569' : '#0f172a',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={group.label}
                                  >
                                    {group.label}
                                  </span>
                                  {statusUpper && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        flexShrink: 0,
                                        background: statusUpper === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                                        color: statusUpper === 'ACTIVE' ? '#166534' : '#92400e',
                                      }}
                                    >
                                      {statusUpper}
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                    {activeInGroup}/{group.forms.length} active
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      color: '#334155',
                                    }}
                                  >
                                    {totalLeadsInGroup} submissions
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleCampaignForms(
                                        group.forms.map(f => f.formId),
                                        !allGroupActive
                                      )
                                    }
                                    style={{
                                      background: allGroupActive ? '#ffffff' : '#1d4ed8',
                                      color: allGroupActive ? '#475569' : '#ffffff',
                                      border: allGroupActive ? '1px solid #cbd5e1' : '1px solid #1d4ed8',
                                      borderRadius: 5,
                                      padding: '3px 9px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {allGroupActive ? 'Disable Group' : 'Enable All'}
                                  </button>
                                </div>
                              </div>

                              {/* Nested Forms inside Campaign */}
                              {!isCollapsed && (
                                <div style={{ padding: '10px 10px 2px 10px', display: 'flex', flexDirection: 'column' }}>
                                  {group.isUnlinked && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        fontSize: 11,
                                        color: '#64748b',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 6,
                                        padding: '7px 10px',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <span>
                                        {metaCampaignNotice
                                          ? `Meta API note: ${metaCampaignNotice}`
                                          : !metaConfig?.adAccountId
                                            ? 'Click Refresh to link forms with Meta submissions to their Campaigns. Add your Ad Account ID in Credentials to also map 0-submission forms.'
                                            : 'Forms here either have 0 submissions or were not returned by active Ads in Meta.'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={handleFetchMetaForms}
                                        disabled={fetchingMetaForms}
                                        style={{
                                          background: '#eff6ff',
                                          color: '#1d4ed8',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: 5,
                                          padding: '3px 9px',
                                          fontSize: 11,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {fetchingMetaForms ? 'Fetching...' : 'Fetch Campaigns Now'}
                                      </button>
                                    </div>
                                  )}
                                  {group.forms.map(form => renderMetaFormRow(form, false))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {metaForms.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        className="btn-pulse"
                        onClick={handleSaveFormsSelection}
                        disabled={savingMetaForms}
                        style={{
                          background: '#0f172a',
                          padding: '9px 18px',
                          fontSize: 13,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Check size={15} />
                        <span>{savingMetaForms ? 'Saving...' : 'Save Form Selection'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  TAB 2: CREDENTIALS & PAGE ID
                  ======================================================== */}
              {metaTab === 'credentials' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                      Facebook Page & Graph API Access Token
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                      Enter your Meta Page ID and Page Access Token. Tokens are securely encrypted and stored in Database Atlas and never exposed in client payloads.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        FACEBOOK PAGE ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 535206066342370"
                        value={metaPageIdInput}
                        onChange={e => setMetaPageIdInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Your Facebook Page ID for Futureace Healthcare Academy.
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        META AD ACCOUNT ID (OPTIONAL — FOR 0-LEAD CAMPAIGN GROUPING)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10183628... (from Ads Manager top dropdown)"
                        value={metaAdAccountIdInput}
                        onChange={e => setMetaAdAccountIdInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Forms with submissions group under Campaigns automatically using your Page Token. Add your Ad Account ID (with <code>ads_read</code> permission) to also link 0-submission forms to Ads Manager Campaigns.
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        META PAGE ACCESS TOKEN (Never-Expiring System or Page Token)
                      </label>
                      {metaConfig?.hasToken && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 6,
                            marginBottom: 8,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534' }}>
                            <ShieldCheck size={15} />
                            <span>Active Token Saved: <code>{metaConfig.maskedToken}</code></span>
                          </div>
                          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Secured in DB</span>
                        </div>
                      )}
                      <input
                        type="password"
                        placeholder={metaConfig?.hasToken ? 'Paste new token to replace existing token...' : 'EAAG...'}
                        value={metaTokenInput}
                        onChange={e => setMetaTokenInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                          fontFamily: 'monospace',
                        }}
                      />
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Requires permissions: <code>leads_retrieval</code>, <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_ads</code>.
                      </div>
                    </div>

                    {/* Auto Sync Toggle */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                          Background Cron Poller (Standby)
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Standby by default: Meta Webhook provides immediate real-time auto round-robin allocation
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={metaAutoSync}
                          onChange={e => setMetaAutoSync(e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    {/* Meta Developer Guide Callout */}
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Key size={14} color="#1877f2" /> How to get your Page Access Token:
                      </div>
                      <ol style={{ paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
                        <li>Go to <strong>developers.facebook.com</strong> &gt; Tools &gt; <strong>Graph API Explorer</strong>.</li>
                        <li>Select your Meta App and choose <strong>Page Token</strong> for your Page.</li>
                        <li>Add scopes: <code>leads_retrieval</code>, <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_ads</code>.</li>
                        <li>Generate token, copy and paste it into the field above.</li>
                      </ol>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                      <button
                        className="btn-pulse-secondary"
                        onClick={handleFetchMetaForms}
                        disabled={savingMetaConfig || fetchingMetaForms || (!metaConfig?.hasToken && !metaTokenInput)}
                      >
                        <RefreshCw size={14} className={fetchingMetaForms ? 'spin' : ''} />
                        <span>Test & Fetch Forms</span>
                      </button>
                      <button
                        className="btn-pulse"
                        onClick={handleSaveMetaCredentials}
                        disabled={savingMetaConfig}
                        style={{
                          background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Check size={15} />
                        <span>{savingMetaConfig ? 'Saving...' : 'Save Credentials'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 3: REAL-TIME ALERTS SETUP
                  ======================================================== */}
              {metaTab === 'alerts' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                      Real-Time Lead Pool Arrival Alerts
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Get notified the moment a candidate fills out a Facebook lead ad so your admissions counselors can call immediately.
                    </div>
                  </div>

                  {/* Channel 1: In-App Audio Chime */}
                  <div className="alert-channel-card">
                    <div className="alert-channel-header">
                      <div className="alert-channel-title">
                        <Volume2 size={18} color="#0284c7" />
                        <span>In-App Audio Chime (Dual-Tone Web Audio)</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={metaAlerts.soundAlert}
                          onChange={e => setMetaAlerts(prev => ({ ...prev, soundAlert: e.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="alert-channel-desc">
                      Plays an uplifting dual-tone audio chime (C5 &rarr; G5) directly inside the CRM whenever new leads arrive into the pool.
                    </div>
                    <button
                      className="btn-pulse-secondary"
                      onClick={handleTestChime}
                      style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Volume2 size={13} />
                      <span>Test Chime Sound</span>
                    </button>
                  </div>

                  {/* Channel 2: Desktop Push Notifications */}
                  <div className="alert-channel-card">
                    <div className="alert-channel-header">
                      <div className="alert-channel-title">
                        <Bell size={18} color="#f59e0b" />
                        <span>Desktop Browser Push Notifications</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={metaAlerts.browserNotifications}
                          onChange={e => setMetaAlerts(prev => ({ ...prev, browserNotifications: e.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="alert-channel-desc">
                      Shows a native desktop push notification even if this browser tab is minimized or in the background. Clicking the notification focuses the CRM immediately.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        className="btn-pulse-secondary"
                        onClick={handleTestBrowserNotification}
                        style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Bell size={13} />
                        <span>Enable & Test Push Notification</span>
                      </button>
                      <span style={{ fontSize: 11, color: browserPermissionState === 'granted' ? '#16a34a' : '#94a3b8' }}>
                        Permission: <strong>{browserPermissionState}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Channel 3: Telegram Bot Notification */}
                  <div className="alert-channel-card">
                    <div className="alert-channel-header">
                      <div className="alert-channel-title">
                        <Send size={18} color="#0088cc" />
                        <span>Telegram Channel / Group Alert Bot</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={metaAlerts.telegramEnabled}
                          onChange={e => setMetaAlerts(prev => ({ ...prev, telegramEnabled: e.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="alert-channel-desc">
                      Directly dispatches candidate details (Name, Phone, City, Qualification, Form Name) to your Telegram team channel or counselor group as soon as Meta delivers the lead.
                    </div>

                    {metaAlerts.telegramEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            TELEGRAM BOT TOKEN
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                            value={metaAlerts.telegramBotToken}
                            onChange={e => setMetaAlerts(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 5, border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            TELEGRAM CHAT ID / CHANNEL ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. -1001234567890 or @futureace_leads"
                            value={metaAlerts.telegramChatId}
                            onChange={e => setMetaAlerts(prev => ({ ...prev, telegramChatId: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 5, border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div>
                          <button
                            className="btn-pulse-secondary"
                            onClick={handleTestTelegram}
                            disabled={testingTelegram}
                            style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Send size={13} />
                            <span>{testingTelegram ? 'Sending Test...' : 'Send Test Telegram Alert'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel 4: Custom Webhook / Zapier */}
                  <div className="alert-channel-card">
                    <div className="alert-channel-header">
                      <div className="alert-channel-title">
                        <Radio size={18} color="#8b5cf6" />
                        <span>Custom Webhook / Zapier / Make Integration</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={metaAlerts.webhookEnabled}
                          onChange={e => setMetaAlerts(prev => ({ ...prev, webhookEnabled: e.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="alert-channel-desc">
                      POST JSON lead objects to your custom webhook endpoint or Zapier/Make workflow whenever new leads are imported.
                    </div>

                    {metaAlerts.webhookEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            WEBHOOK TARGET URL
                          </label>
                          <input
                            type="url"
                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                            value={metaAlerts.webhookUrl}
                            onChange={e => setMetaAlerts(prev => ({ ...prev, webhookUrl: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 5, border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div>
                          <button
                            className="btn-pulse-secondary"
                            onClick={handleTestWebhook}
                            disabled={testingWebhook}
                            style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Radio size={13} />
                            <span>{testingWebhook ? 'Sending...' : 'Test Webhook Ping'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                      className="btn-pulse"
                      onClick={handleSaveAlerts}
                      disabled={savingMetaConfig}
                      style={{
                        background: 'linear-gradient(135deg, #1877f2 0%, #0d5cb6 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 18px',
                      }}
                    >
                      <Check size={15} />
                      <span>{savingMetaConfig ? 'Saving...' : 'Save Alert Preferences'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Meta Graph API v21.0 • Connected to Database Lead Pool
              </div>
              <button
                className="btn-pulse-secondary"
                onClick={() => setShowMetaModal(false)}
                disabled={fetchingMetaForms || syncingMetaLeads}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FORM LEADS PREVIEW & OPTIONAL POOL INGESTION
          ======================================================== */}
      {showFormPreviewModal && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal-card" style={{ maxWidth: 960, width: '95%', maxHeight: '92vh', position: 'relative' }}>
            {previewLoading && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Fetching Live Form Leads from Meta Graph API...</div>
                <div className="data-loader-sub">Extracting candidate data, Malayalam cities & checking CRM status</div>
              </div>
            )}
            {importingPreview && (
              <div className="modal-loading-overlay">
                <div className="data-loader-spinner" />
                <div className="data-loader-text">Adding Selected Leads to Pool...</div>
                <div className="data-loader-sub">Saving unassigned leads into Database Atlas</div>
              </div>
            )}

            <div className="modal-header" style={{ background: '#0f172a' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={18} color="#38bdf8" />
                  <h3 style={{ margin: 0, fontSize: 16 }}>Form Lead Data Preview: {previewFormName}</h3>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Form ID: <code>{previewFormId}</code> • Inspect candidate submissions before adding to pool
                </div>
              </div>
              <button
                onClick={() => setShowFormPreviewModal(false)}
                disabled={importingPreview}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Token Expired / Error Banner */}
            {previewTokenExpired && (
              <div
                style={{
                  padding: '12px 18px',
                  background: '#fffbeb',
                  borderBottom: '1px solid #fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={20} color="#d97706" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      Meta Access Token Expired (OAuth Session Expired)
                    </div>
                    <div style={{ fontSize: 12, color: '#b45309' }}>
                      Your Meta Page Access Token expired. Please paste a fresh token in Meta Settings to fetch live submissions.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-pulse"
                  onClick={() => {
                    setShowFormPreviewModal(false)
                    setShowMetaModal(true)
                  }}
                  style={{
                    background: '#d97706',
                    fontSize: 12,
                    padding: '6px 14px',
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                  }}
                >
                  Update Meta Token
                </button>
              </div>
            )}

            {/* Action / Selection Bar */}
            <div
              style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  style={{
                    border: previewFilter === 'all' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: previewFilter === 'all' ? '#e0f2fe' : '#ffffff',
                    color: previewFilter === 'all' ? '#0369a1' : '#475569',
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All Submissions ({previewLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('new')}
                  style={{
                    border: previewFilter === 'new' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: previewFilter === 'new' ? '#dcfce7' : '#ffffff',
                    color: previewFilter === 'new' ? '#15803d' : '#475569',
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Ready to Ingest ({previewLeads.filter(l => l.systemState === 'NOT_IN_SYSTEM' || !l.isExistingInDb).length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('pool')}
                  style={{
                    border: previewFilter === 'pool' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: previewFilter === 'pool' ? '#eff6ff' : '#ffffff',
                    color: previewFilter === 'pool' ? '#1e40af' : '#475569',
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  In Pool ({previewLeads.filter(l => l.systemState === 'IN_POOL' || (l.isExistingInDb && !l.assignedAdvisor)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('assigned')}
                  style={{
                    border: previewFilter === 'assigned' ? '2px solid #9333ea' : '1px solid #cbd5e1',
                    background: previewFilter === 'assigned' ? '#faf5ff' : '#ffffff',
                    color: previewFilter === 'assigned' ? '#7e22ce' : '#475569',
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Assigned ({previewLeads.filter(l => l.systemState === 'ASSIGNED' || !!l.assignedAdvisor).length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  onClick={() => handleSelectAllPreview(true)}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  Select All Ready ({previewLeads.filter(l => l.systemState === 'NOT_IN_SYSTEM' || !l.isExistingInDb).length})
                </button>
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  onClick={() => handleSelectAllPreview(false)}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  Select All ({previewLeads.length})
                </button>
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  onClick={handleDeselectAllPreview}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  className="btn-pulse"
                  onClick={handleImportSelectedLeads}
                  disabled={previewSelectedIds.length === 0 || importingPreview}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    fontSize: 12,
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                >
                  <Download size={14} />
                  <span>Add Selected ({previewSelectedIds.length}) to Pool</span>
                </button>
                {(() => {
                  const selectedInCrm = previewLeads.filter(
                    l =>
                      previewSelectedIds.includes(l.metaLeadId) &&
                      (l.isExistingInDb || l.systemState === 'ASSIGNED' || l.systemState === 'IN_POOL')
                  )
                  return (
                    <button
                      type="button"
                      className="btn-pulse-danger"
                      onClick={() => handleRemovePreviewLeads(selectedInCrm)}
                      disabled={selectedInCrm.length === 0 || deletingLeads}
                      style={{
                        fontSize: 12,
                        padding: '6px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        opacity: selectedInCrm.length === 0 || deletingLeads ? 0.5 : 1,
                      }}
                      title="Remove selected retrieved leads from CRM (Assigned & System Pool)"
                    >
                      <Trash2 size={14} />
                      <span>Remove from CRM ({selectedInCrm.length})</span>
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Leads Table */}
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
              {(() => {
                const displayedLeads = previewLeads.filter(lead => {
                  if (previewFilter === 'new') return lead.systemState === 'NOT_IN_SYSTEM' || !lead.isExistingInDb
                  if (previewFilter === 'pool') return lead.systemState === 'IN_POOL' || (lead.isExistingInDb && !lead.assignedAdvisor)
                  if (previewFilter === 'assigned') return lead.systemState === 'ASSIGNED' || !!lead.assignedAdvisor
                  return true
                })

                if (displayedLeads.length === 0 && !previewLoading) {
                  return (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      {previewTokenExpired
                        ? 'Cannot load leads: Meta access token expired. Please renew token above.'
                        : previewFilter !== 'all'
                          ? `No leads found with filter "${previewFilter}".`
                          : 'No lead submissions found for this form on Meta.'}
                    </div>
                  )
                }

                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="leads-table" style={{ width: '100%', minWidth: 720, margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={
                                displayedLeads.length > 0 &&
                                displayedLeads.every(l => previewSelectedIds.includes(l.metaLeadId))
                              }
                              onChange={e => {
                                if (e.target.checked) {
                                  const idsToAdd = displayedLeads.map(l => l.metaLeadId)
                                  setPreviewSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
                                } else {
                                  const idsToRemove = displayedLeads.map(l => l.metaLeadId)
                                  setPreviewSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)))
                                }
                              }}
                            />
                          </th>
                          <th>Candidate Name</th>
                          <th>Phone & Email</th>
                          <th>Educational Qualification</th>
                          <th>Preferred City</th>
                          <th>Submitted At</th>
                          <th>CRM System Status</th>
                          <th style={{ width: 90, textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedLeads.map(lead => {
                          const isSelected = previewSelectedIds.includes(lead.metaLeadId)
                          const isAssigned = lead.systemState === 'ASSIGNED' || !!lead.assignedAdvisor
                          const isInPool = lead.systemState === 'IN_POOL' || (lead.isExistingInDb && !lead.assignedAdvisor)
                          const isNew = !lead.isExistingInDb || lead.systemState === 'NOT_IN_SYSTEM'

                          return (
                            <tr
                              key={lead.metaLeadId}
                              style={{
                                background: isSelected ? '#f0f9ff' : !isNew ? '#fafafa' : '#fff',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleTogglePreviewSelect(lead.metaLeadId)}
                            >
                              <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleTogglePreviewSelect(lead.metaLeadId)}
                                />
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{lead.fullName}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>ID: {lead.metaLeadId}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: '#0284c7' }}>{lead.phone}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{lead.email || '—'}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: '#334155' }}>{lead.qualification}</span>
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <MapPin size={12} color="#64748b" />
                                  <span>{lead.preferredLocation}</span>
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: '#64748b' }}>
                                {lead.createdTime ? new Date(lead.createdTime).toLocaleString() : 'Recent'}
                              </td>
                              <td>
                                {isAssigned ? (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '4px 9px',
                                      borderRadius: 12,
                                      background: '#f3e8ff',
                                      color: '#7e22ce',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="This candidate has already been assigned to an Admissions Counselor"
                                  >
                                    <UserCheck size={12} />
                                    Assigned: {lead.assignedAdvisor || lead.existingAssignment || 'Sales Advisor'}
                                  </span>
                                ) : isInPool ? (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '4px 9px',
                                      borderRadius: 12,
                                      background: '#e0f2fe',
                                      color: '#0369a1',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="This candidate is currently in the unassigned pool"
                                  >
                                    <Layers size={12} />
                                    In Pool (Unassigned)
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '4px 9px',
                                      borderRadius: 12,
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Not yet in CRM database. Ready to ingest."
                                  >
                                    <Sparkles size={12} />
                                    + Ready to Ingest
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                {isAssigned || isInPool ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePreviewLeads([lead])}
                                    disabled={deletingLeads}
                                    title={isAssigned ? 'Remove assigned lead from CRM' : 'Remove pool lead from CRM'}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      border: '1px solid #fecaca',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: deletingLeads ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <Trash2 size={12} />
                                    <span>Remove</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Selected: <strong>{previewSelectedIds.length}</strong> of <strong>{previewLeads.length}</strong> leads
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-pulse-secondary"
                  onClick={() => setShowFormPreviewModal(false)}
                  disabled={importingPreview}
                >
                  Close
                </button>
                <button
                  className="btn-pulse"
                  onClick={handleImportSelectedLeads}
                  disabled={previewSelectedIds.length === 0 || importingPreview}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    fontWeight: 700,
                  }}
                >
                  {importingPreview ? 'Adding to Pool...' : `Add Selected (${previewSelectedIds.length}) to Pool`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {showUserModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => !savingUser && setShowUserModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: editingUser ? '#f1f5f9' : '#eff6ff',
                    color: editingUser ? '#475569' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {editingUser ? <Edit2 size={19} /> : <UserPlus size={19} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    {editingUser ? 'Edit Staff Member' : 'Add New Advisor / User'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>
                    {editingUser
                      ? `Updating details for ${editingUser.name}`
                      : 'Set up login credentials, role, and specialty focus'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                disabled={savingUser}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="modal-input"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Work Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="s.jenkins@futureace.org"
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="modal-input"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                    }}
                  />
                </div>

                {/* Role Pill Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Role & Permissions <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="responsive-grid-2">
                    <div
                      onClick={() => setUserFormData({ ...userFormData, role: 'sales', title: userFormData.title || 'Admissions Counselor' })}
                      style={{
                        border: userFormData.role === 'sales' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: userFormData.role === 'sales' ? '#eff6ff' : '#ffffff',
                        padding: '12px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: userFormData.role === 'sales' ? '5px solid #2563eb' : '2px solid #cbd5e1',
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: userFormData.role === 'sales' ? '#1e40af' : '#1e293b' }}>
                          Admissions Advisor
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', paddingLeft: 24 }}>
                        Manages incoming assigned leads, records call logs, and advances applicant stages.
                      </p>
                    </div>

                    <div
                      onClick={() => setUserFormData({ ...userFormData, role: 'admin', title: userFormData.title || 'Administrator' })}
                      style={{
                        border: userFormData.role === 'admin' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        background: userFormData.role === 'admin' ? '#faf5ff' : '#ffffff',
                        padding: '12px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: userFormData.role === 'admin' ? '5px solid #7c3aed' : '2px solid #cbd5e1',
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: userFormData.role === 'admin' ? '#6b21a8' : '#1e293b' }}>
                          Administrator
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', paddingLeft: 24 }}>
                        Full access to overview stats, pool distribution, Meta integration, and user administration.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Job Title & Specialty Territory */}
                <div className="responsive-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Admissions Advisor"
                      value={userFormData.title}
                      onChange={e => setUserFormData({ ...userFormData, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Specialty / Focus Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nursing, Pharmacy, General"
                      value={userFormData.specialty}
                      onChange={e => setUserFormData({ ...userFormData, specialty: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                {/* Counselor Group Assignment (for role === 'sales') */}
                {userFormData.role === 'sales' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Counselor Group / Team
                    </label>
                    <select
                      value={userFormData.groupId || ''}
                      onChange={e => setUserFormData({ ...userFormData, groupId: e.target.value || null })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        background: '#fff',
                      }}
                    >
                      <option value="">No Group Assigned (Independent Counselor)</option>
                      {counselorGroups.map(g => (
                        <option key={g.id || g._id} value={g.id || g._id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Password field */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    {editingUser ? 'Update Password (leave blank to keep current)' : 'Account Password'} {!editingUser && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      placeholder={editingUser ? '••••••••  (unchanged)' : 'Enter initial password (min 6 characters)'}
                      value={userFormData.password}
                      onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    />
                    <Lock size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  </div>
                </div>

                {/* Telegram Notifications Configuration for this User */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Send size={14} />
                        <span>Telegram Notifications</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        Enable or disable instant Telegram bot alerts for this user
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setUserFormData(prev => ({
                          ...prev,
                          telegramNotificationsEnabled: !prev.telegramNotificationsEnabled,
                        }))
                      }
                      style={{
                        background: userFormData.telegramNotificationsEnabled ? '#0284c7' : '#cbd5e1',
                        border: 'none',
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        padding: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: userFormData.telegramNotificationsEnabled ? 'flex-end' : 'flex-start',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Telegram Chat ID (User must press /start on the bot first)
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="e.g. 123456789"
                        value={userFormData.telegramChatId || ''}
                        onChange={e =>
                          setUserFormData(prev => ({ ...prev, telegramChatId: e.target.value }))
                        }
                        style={{
                          flex: '1 1 180px',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          background: '#ffffff',
                        }}
                      />
                      {editingUser && (
                        <button
                          type="button"
                          onClick={handleGenerateUserConnectLink}
                          disabled={generatingConnectLink}
                          className="btn-pulse-secondary"
                          style={{
                            fontSize: 11,
                            padding: '7px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: '#0284c7',
                            color: '#ffffff',
                            borderColor: '#0284c7',
                          }}
                          title="Generate & copy unique Telegram auto-connect link for this user"
                        >
                          <ExternalLink size={12} />
                          <span>{generatingConnectLink ? 'Generating...' : 'Copy Connect Link'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleFetchBotChats}
                        disabled={fetchingBotChats}
                        className="btn-pulse-secondary"
                        style={{
                          fontSize: 11,
                          padding: '7px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#ffffff',
                          color: '#0369a1',
                          borderColor: '#7dd3fc',
                        }}
                        title="Detect Chat IDs of users who sent /start to your Telegram bot"
                      >
                        <RefreshCw size={12} className={fetchingBotChats ? 'animate-spin' : ''} />
                        <span>{fetchingBotChats ? 'Fetching...' : 'Fetch Chat IDs'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTestUserTelegram}
                        disabled={testingUserTelegram || !String(userFormData.telegramChatId || '').trim()}
                        className="btn-pulse-secondary"
                        style={{
                          fontSize: 11,
                          padding: '7px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#ffffff',
                        }}
                      >
                        <Send size={12} />
                        <span>{testingUserTelegram ? 'Sending...' : 'Send Test'}</span>
                      </button>
                    </div>
                    {userConnectUrl && (
                      <div
                        style={{
                          marginTop: 8,
                          background: '#ffffff',
                          border: '1px solid #7dd3fc',
                          borderRadius: 6,
                          padding: '8px 10px',
                          fontSize: 11,
                          color: '#0369a1',
                          wordBreak: 'break-all',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>Unique Auto-Connect Link for {editingUser?.name}:</div>
                        <a href={userConnectUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>
                          {userConnectUrl}
                        </a>
                      </div>
                    )}
                    {detectedBotChats.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          background: '#ffffff',
                          border: '1px solid #bae6fd',
                          borderRadius: 6,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                          Recent Bot Chats{detectedBotUsername ? ` (${detectedBotUsername})` : ''} — Click a person to fill their Chat ID:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                          {detectedBotChats.map(c => (
                            <button
                              key={c.chatId}
                              type="button"
                              onClick={() => {
                                setUserFormData(prev => ({ ...prev, telegramChatId: c.chatId }))
                                setUserTelegramFeedback({
                                  type: 'success',
                                  message: `Selected Chat ID ${c.chatId} (${c.displayName}). Click Send Test or Save Changes.`,
                                })
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '6px 9px',
                                borderRadius: 6,
                                border: userFormData.telegramChatId === c.chatId ? '1px solid #0284c7' : '1px solid #e2e8f0',
                                background: userFormData.telegramChatId === c.chatId ? '#e0f2fe' : '#f8fafc',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                                  {c.displayName} {c.username ? <span style={{ color: '#64748b', fontWeight: 500 }}>({c.username})</span> : null}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>
                                  ID: <strong>{c.chatId}</strong> • {c.type}{c.lastText ? ` • "${c.lastText}"` : ''}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', flexShrink: 0 }}>
                                Use ID
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {userTelegramFeedback && (
                      <div
                        role="alert"
                        style={{
                          marginTop: 8,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: `1px solid ${userTelegramFeedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                          background: userTelegramFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                          color: userTelegramFeedback.type === 'error' ? '#991b1b' : '#166534',
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          {userTelegramFeedback.type === 'error' ? (
                            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                          ) : (
                            <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                          )}
                          <span>{userTelegramFeedback.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUserTelegramFeedback(null)}
                          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Role-Aware Per-User Event Preferences */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {userFormData.role === 'admin'
                        ? 'Admin Alerts for This Account:'
                        : 'Personal Alerts for This Counselor (Own Leads Only):'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 6 }}>
                      {(userFormData.role === 'admin'
                        ? [
                            { key: 'newLead', label: 'New Leads Captured' },
                            { key: 'discountRequested', label: 'Discount Approval Requests' },
                            { key: 'businessMilestone', label: 'Business Milestones Reached' },
                          ]
                        : [
                            { key: 'leadAssigned', label: 'Leads Assigned to Counselor' },
                            { key: 'discountDecision', label: 'Discount Approved / Rejected' },
                            { key: 'businessMilestone', label: 'Own Lead Milestone Updates' },
                          ]
                      ).map(pref => (
                        <label
                          key={pref.key}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: '#1e293b',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '5px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={userFormData.telegramPreferences?.[pref.key] !== false}
                            onChange={e =>
                              setUserFormData(prev => ({
                                ...prev,
                                telegramPreferences: {
                                  ...(prev.telegramPreferences || {}),
                                  [pref.key]: e.target.checked,
                                },
                              }))
                            }
                          />
                          <span>{pref.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Toggle (Sales accounts only — Admin accounts cannot be disabled) */}
                {userFormData.role !== 'admin' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Account Status</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {userFormData.active
                          ? 'Active — advisor can sign in and receive newly distributed leads'
                          : 'Disabled — advisor cannot sign in or receive leads'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUserFormData({ ...userFormData, active: !userFormData.active })}
                      style={{
                        background: userFormData.active ? '#10b981' : '#cbd5e1',
                        border: 'none',
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        padding: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: userFormData.active ? 'flex-end' : 'flex-start',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn-pulse-secondary"
                  onClick={() => setShowUserModal(false)}
                  disabled={savingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pulse"
                  disabled={savingUser}
                  style={{ minWidth: 120, fontWeight: 600 }}
                >
                  {savingUser ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FORM COUNSELOR ASSIGNMENT POP-UP
          ======================================================== */}
      {assigningForm && (
        <div
          className="modal-overlay"
          style={{ zIndex: 20000, background: 'rgba(15, 23, 42, 0.7)' }}
          onClick={() => setAssigningForm(null)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 500, width: '95%', position: 'relative', zIndex: 20001, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#0f172a', color: '#fff', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Form Assignment: {assigningForm.formName}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.8 }}>
                    Select one, multiple, or all counselors to receive leads
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningForm(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 18px' }}>
              {/* SELECT ALL AT TOP (DEFAULT) */}
              <div
                onClick={() => handleToggleAllCounselorsForForm(assigningForm.formId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: isFormAllSelected(assigningForm) ? '#eff6ff' : '#f8fafc',
                  border: isFormAllSelected(assigningForm) ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  marginBottom: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={isFormAllSelected(assigningForm)}
                    onChange={() => { }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      All Admissions Counselors (Default)
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Rotates capacity round-robin between all active counselors
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                  {salesReps.length} Counselors
                </span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
                Or Select Counselor(s):
              </div>

              {/* LIST OF COUNSELORS */}
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px' }}>
                {salesReps.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: 10 }}>No active counselors found.</div>
                ) : (
                  salesReps.map(rep => {
                    const repId = String(rep.id || rep._id)
                    const isSelected = isFormCounselorSelected(assigningForm, repId)
                    return (
                      <div
                        key={repId}
                        onClick={() => handleToggleCounselorForForm(assigningForm.formId, repId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: isSelected ? '#f0fdf4' : 'transparent',
                          marginBottom: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: '#0f172a' }}>
                              {rep.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              {rep.title || 'Admissions Counselor'} • {rep.email}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>
                            Selected
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Dynamic rule explanation */}
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 11, color: '#475569' }}>
                <strong>Routing Rule:</strong> {getFormRoutingSummary(assigningForm)}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-pulse"
                onClick={() => {
                  setAssigningForm(null)
                  handleSaveFormsSelection()
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Done & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Staff Account Confirmation Modal (Zero Deletion — Preserves Initial Advisor) */}
      {showDisableUserModal && disablingUser && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => !disablingInProgress && setShowDisableUserModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #fee2e2',
                background: '#fff5f5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#fecaca',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserX size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                    Disable Staff Account
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>
                    Blocks login immediately — zero lead or activity data is lost
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDisableUserModal(false)}
                disabled={disablingInProgress}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: 14, color: '#334155', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                Disable login access for <strong>{disablingUser.name}</strong> ({disablingUser.email})?
                Their account will move to the <strong>Disabled / Old Sales Reps</strong> archive and all historical leads will keep <strong>{disablingUser.name}</strong> as their <strong>Initial Advisor</strong>.
              </p>

              {(disablingUser.openAssignedCount || 0) > 0 ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 8,
                    padding: '14px',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={17} color="#d97706" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      Open Leads: {disablingUser.openAssignedCount} (Total Assigned: {disablingUser.totalAssigned})
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Converted, Onboarded, Lost, and Non-Prospect leads are never altered. Choose how to handle their <strong>{disablingUser.openAssignedCount} open lead(s)</strong>:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#1e293b',
                        background: disableHandoverMode === 'keep' ? '#ffffff' : 'transparent',
                        border: disableHandoverMode === 'keep' ? '1px solid #0284c7' : '1px solid #fde68a',
                        padding: '8px 10px',
                        borderRadius: 6,
                      }}
                    >
                      <input
                        type="radio"
                        name="disableHandoverMode"
                        checked={disableHandoverMode === 'keep'}
                        onChange={() => setDisableHandoverMode('keep')}
                        style={{ marginTop: 2 }}
                      />
                      <span>
                        <strong>Keep all leads attributed to {disablingUser.name}</strong> (Recommended — read-only archive; you can reassign anytime later).
                      </span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#1e293b',
                        background: disableHandoverMode === 'reassign_open' ? '#ffffff' : 'transparent',
                        border: disableHandoverMode === 'reassign_open' ? '1px solid #0284c7' : '1px solid #fde68a',
                        padding: '8px 10px',
                        borderRadius: 6,
                      }}
                    >
                      <input
                        type="radio"
                        name="disableHandoverMode"
                        checked={disableHandoverMode === 'reassign_open'}
                        onChange={() => setDisableHandoverMode('reassign_open')}
                        style={{ marginTop: 2 }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>Hand over {disablingUser.openAssignedCount} open lead(s)</strong> (Initial Advisor stays permanently set to <strong>{disablingUser.name}</strong>):
                        {disableHandoverMode === 'reassign_open' && (
                          <select
                            value={disableTargetRepId}
                            onChange={e => setDisableTargetRepId(e.target.value)}
                            style={{
                              marginTop: 8,
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              background: '#fff',
                            }}
                          >
                            <option value="pool">Return open leads to System Pool (Unassigned)</option>
                            {salesReps
                              .filter(r => String(r.id) !== String(disablingUser.id))
                              .map(r => (
                                <option key={r.id} value={r.id}>
                                  Reassign open leads to: {r.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px',
                    marginBottom: 14,
                    fontSize: 12,
                    color: '#475569',
                  }}
                >
                  This staff member has 0 open leads. Disabling blocks login while preserving all {disablingUser.historicalLeadsCount || 0} historical lead record(s).
                </div>
              )}

              <p style={{ fontSize: 12, color: '#0369a1', margin: 0, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="#0369a1" />
                <span>You can view their complete lead history or re-enable their account anytime from Disabled / Old Sales Reps.</span>
              </p>
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn-pulse-secondary"
                onClick={() => setShowDisableUserModal(false)}
                disabled={disablingInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisableUser}
                disabled={disablingInProgress}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserX size={14} />
                <span>{disablingInProgress ? 'Disabling...' : 'Confirm Disable'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause / Resume Counselor Modal */}
      {showPauseUserModal && pausingUser && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1050 }}
          onClick={() => !pausingInProgress && setShowPauseUserModal(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 480, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                background: pausingUser.isPaused ? '#059669' : '#d97706',
                color: '#fff',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {pausingUser.isPaused ? <Play size={20} /> : <Pause size={20} />}
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                    {pausingUser.isPaused ? 'Resume Counselor Allocation' : 'Pause Counselor from Leads'}
                  </h3>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    {pausingUser.name} ({pausingUser.title || 'Admissions Counselor'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPauseUserModal(false)}
                disabled={pausingInProgress}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {pausingUser.isPaused ? (
                <div>
                  <p style={{ fontSize: 13, color: '#334155', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    <strong>{pausingUser.name}</strong> is currently paused from round-robin lead allocation.
                    Resuming will immediately re-include them in Meta auto-assignment, manual pool round-robin, and recycling.
                  </p>
                  {pausingUser.pauseReason && (
                    <div
                      style={{
                        padding: '10px 14px',
                        background: '#fef3c7',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#92400e',
                        marginBottom: 14,
                      }}
                    >
                      <strong>Active Pause Reason:</strong> {pausingUser.pauseReason}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: '#334155', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    Pausing temporarily stops this counselor from receiving leads via Meta webhook auto-allocation and manual round-robin.
                    Their existing assigned leads remain untouched with full access.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        PAUSE START DATE
                      </label>
                      <input
                        type="date"
                        value={pauseStartDate}
                        onChange={e => setPauseStartDate(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        AUTO-RESUME DATE (OPTIONAL)
                      </label>
                      <input
                        type="date"
                        value={pauseEndDate}
                        onChange={e => setPauseEndDate(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      REASON (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Leave, Medical, Travel, Exams..."
                      value={pauseReason}
                      onChange={e => setPauseReason(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: 6 }}>
                    ℹ️ If an auto-resume date is set, the system will automatically start routing leads to this counselor once the date passes.
                  </div>
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn-pulse-secondary"
                onClick={() => setShowPauseUserModal(false)}
                disabled={pausingInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPauseUser(!pausingUser.isPaused)}
                disabled={pausingInProgress}
                style={{
                  background: pausingUser.isPaused ? '#059669' : '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {pausingUser.isPaused ? <Play size={14} /> : <Pause size={14} />}
                <span>
                  {pausingInProgress
                    ? 'Updating...'
                    : pausingUser.isPaused
                    ? 'Resume Counselor'
                    : 'Confirm Pause'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Allocated Leads History & Activity Detail Panel */}
      {historyUserId && (
        <StaffHistoryDrawer
          userId={historyUserId}
          onClose={() => setHistoryUserId(null)}
          onInspectLead={lead => setActiveStepLead(lead)}
          onStatusChanged={async () => {
            await loadUsers(1, showDisabledUsers, userRoleFilter, userSearch)
            const repsData = await api.getSalesReps()
            setSalesReps(repsData || [])
          }}
          showNotify={showNotify}
        />
      )}

      {/* Self-Service Admin Profile & Telegram Chat ID Modal */}
      <MyProfileTelegramModal
        isOpen={showMyProfileModal}
        user={user}
        onClose={() => setShowMyProfileModal(false)}
        onProfileUpdated={updatedUser => {
          onUserUpdated?.(updatedUser)
          if (activeTab === 'users') {
            loadUsers(usersPage, showDisabledUsers, userRoleFilter, userSearch)
          }
        }}
        showNotify={showNotify}
      />
    </div>
  )
}
