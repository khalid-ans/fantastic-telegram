import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFolders, createFolder, deleteFolder, getEntities, syncFromTelegram, updateFolder } from '../services/api'
import { FolderPlus, Trash2, Users, Loader2, Search, Hash, Radio, CheckCircle2, X, RefreshCw, Download, Pencil, Save, XCircle } from 'lucide-react'

function FolderManager() {
    const [viewingFolder, setViewingFolder] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editingFolderId, setEditingFolderId] = useState(null)
    const [newFolderName, setNewFolderName] = useState('')
    const [newFolderDesc, setNewFolderDesc] = useState('')
    const [selectedEntities, setSelectedEntities] = useState([])
    const [entitySearch, setEntitySearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all') // 'all', 'user', 'group', 'channel'
    const [showEntitySelector, setShowEntitySelector] = useState(false)
    const queryClient = useQueryClient()

    const { data: folders = [], isLoading } = useQuery({
        queryKey: ['folders'],
        queryFn: getFolders
    })

    const { data: entities = [], isLoading: entitiesLoading } = useQuery({
        queryKey: ['entities'],
        queryFn: () => getEntities()
    })

    const resetForm = () => {
        setNewFolderName('')
        setNewFolderDesc('')
        setSelectedEntities([])
        setShowEntitySelector(false)
        setIsEditing(false)
        setEditingFolderId(null)
    }

    const createMutation = useMutation({
        mutationFn: createFolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            resetForm()
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateFolder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            resetForm()
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteFolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
        }
    })

    const syncMutation = useMutation({
        mutationFn: syncFromTelegram,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entities'] })
        }
    })

    const handleCreateOrUpdate = (e) => {
        e.preventDefault()
        if (!newFolderName.trim()) return

        const folderData = {
            name: newFolderName.trim(),
            description: newFolderDesc.trim(),
            entityIds: selectedEntities
        }

        if (isEditing && editingFolderId) {
            updateMutation.mutate({ id: editingFolderId, data: folderData })
        } else {
            createMutation.mutate(folderData)
        }
    }

    const startEditing = (folder) => {
        setIsEditing(true)
        setEditingFolderId(folder._id)
        setNewFolderName(folder.name)
        setNewFolderDesc(folder.description || '')
        setSelectedEntities(folder.entityIds || [])
        setShowEntitySelector(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const startViewing = (folder) => {
        setViewingFolder(folder)
    }

    const closeViewing = () => {
        setViewingFolder(null)
    }

    const getFolderEntities = (folder) => {
        if (!folder || !folder.entityIds) return []
        return entities.filter(e => folder.entityIds.includes(e.telegramId))
    }

    const toggleEntity = (entityId) => {
        setSelectedEntities(prev =>
            prev.includes(entityId)
                ? prev.filter(id => id !== entityId)
                : [...prev, entityId]
        )
    }

    const selectAll = () => {
        setSelectedEntities(entities.map(e => e.telegramId))
    }

    const clearSelection = () => {
        setSelectedEntities([])
    }

    const filteredEntities = entities.filter(entity => {
        const matchesSearch = entity.name.toLowerCase().includes(entitySearch.toLowerCase()) ||
            (entity.username && entity.username.toLowerCase().includes(entitySearch.toLowerCase()))

        const matchesCategory = selectedCategory === 'all' || entity.type === selectedCategory

        return matchesSearch && matchesCategory
    })

    const getEntityIcon = (type) => {
        switch (type) {
            case 'channel': return <Radio className="w-4 h-4 text-blue-500" />
            case 'group': return <Hash className="w-4 h-4 text-green-500" />
            default: return <Users className="w-4 h-4 text-purple-500" />
        }
    }

    return (

        <div className="space-y-8 animate-in">
            {/* View Folder Modal */}
            {viewingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{viewingFolder.name}</h3>
                                <p className="text-sm text-gray-500">{viewingFolder.description || 'No description'}</p>
                            </div>
                            <button onClick={closeViewing} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Included Contacts ({viewingFolder.entityIds?.length || 0})
                            </h4>
                            <div className="space-y-2">
                                {getFolderEntities(viewingFolder).length > 0 ? (
                                    getFolderEntities(viewingFolder).map(entity => (
                                        <div key={entity.telegramId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                                                {getEntityIcon(entity.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{entity.name}</p>
                                                {entity.username && <p className="text-xs text-gray-500 truncate">@{entity.username}</p>}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                                                {entity.type}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>No contacts in this folder.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                            <button
                                onClick={closeViewing}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header>
                <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Folder Manager</h1>
                <p className="text-gray-500">Organize your Telegram contacts into broadcast groups.</p>
            </header>

            {/* Create/Edit Folder Form */}
            <form onSubmit={handleCreateOrUpdate} className={`bg-white rounded-2xl p-6 space-y-4 card-shadow border transition-all duration-300 ${isEditing ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                        {isEditing ? (
                            <>
                                <Pencil className="w-5 h-5 text-primary-500" />
                                Edit Folder
                            </>
                        ) : (
                            <>
                                <FolderPlus className="w-5 h-5 text-primary-500" />
                                Create New Folder
                            </>
                        )}
                    </h2>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel Edit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all placeholder:text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newFolderDesc}
                        onChange={(e) => setNewFolderDesc(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all placeholder:text-gray-400"
                    />
                </div>

                {/* Entity Selection Section */}
                <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2 text-gray-900">
                            <Users className="w-4 h-4 text-primary-500" />
                            Select Channels & Groups
                            {selectedEntities.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 text-xs font-bold">
                                    {selectedEntities.length} selected
                                </span>
                            )}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowEntitySelector(!showEntitySelector)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            {showEntitySelector ? 'Hide' : 'Show'} Selector
                        </button>
                    </div>

                    {showEntitySelector && (
                        <div className="space-y-3">
                            {/* Category Filter */}
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
                                {[
                                    { id: 'all', label: 'All', icon: <Users className="w-3 h-3" /> },
                                    { id: 'channel', label: 'Channels', icon: <Radio className="w-3 h-3" /> },
                                    { id: 'group', label: 'Groups', icon: <Hash className="w-3 h-3" /> },
                                    { id: 'user', label: 'Chats', icon: <Users className="w-3 h-3" /> },
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat.id
                                            ? 'bg-white text-primary-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                        {selectedCategory === cat.id && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary-50 text-[10px]">
                                                {entities.filter(e => cat.id === 'all' || e.type === cat.id).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Search and Actions */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${selectedCategory === 'all' ? 'everything' : selectedCategory + 's'}...`}
                                        value={entitySearch}
                                        onChange={(e) => setEntitySearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none text-sm placeholder:text-gray-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => syncMutation.mutate()}
                                    disabled={syncMutation.isPending}
                                    className="px-3 py-2 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1 border border-green-100"
                                >
                                    {syncMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3 h-3" />
                                    )}
                                    Sync
                                </button>
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Entity List */}
                            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                                {entitiesLoading || syncMutation.isPending ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                                        {syncMutation.isPending && (
                                            <span className="ml-2 text-sm text-gray-500">Syncing from Telegram...</span>
                                        )}
                                    </div>
                                ) : filteredEntities.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400 text-sm">
                                        {entities.length === 0 ? (
                                            <div>
                                                <p className="mb-3">No entities available.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => syncMutation.mutate()}
                                                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors inline-flex items-center gap-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Sync from Telegram
                                                </button>
                                            </div>
                                        ) : 'No matches found.'}
                                    </div>
                                ) : (
                                    filteredEntities.map((entity) => (
                                        <label
                                            key={entity.telegramId}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedEntities.includes(entity.telegramId)
                                                ? 'bg-primary-50 border border-primary-100'
                                                : 'hover:bg-white border border-transparent hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${selectedEntities.includes(entity.telegramId)
                                                ? 'bg-primary-500 border-primary-500'
                                                : 'border-gray-300 bg-white'
                                                }`}>
                                                {selectedEntities.includes(entity.telegramId) && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedEntities.includes(entity.telegramId)}
                                                onChange={() => toggleEntity(entity.telegramId)}
                                                className="sr-only"
                                            />
                                            {getEntityIcon(entity.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{entity.name}</p>
                                                {entity.username && (
                                                    <p className="text-xs text-gray-500">@{entity.username}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{entity.type}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Selected entities preview */}
                    {selectedEntities.length > 0 && !showEntitySelector && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedEntities.slice(0, 5).map(id => {
                                const entity = entities.find(e => e.telegramId === id)
                                return entity ? (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                        {getEntityIcon(entity.type)}
                                        {entity.name}
                                        <button
                                            type="button"
                                            onClick={() => toggleEntity(id)}
                                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ) : null
                            })}
                            {selectedEntities.length > 5 && (
                                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">+{selectedEntities.length - 5} more</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending || !newFolderName.trim()}
                        className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEditing ? (
                            <>
                                <Save className="w-4 h-4" />
                                Update Folder
                            </>
                        ) : (
                            <>
                                <FolderPlus className="w-4 h-4" />
                                Create Folder
                            </>
                        )}
                        {selectedEntities.length > 0 && `(${selectedEntities.length})`}
                    </button>
                </div>
            </form>

            {/* Existing Folders */}
            <div>
                <h2 className="text-lg font-bold mb-4 text-gray-900">Your Folders ({folders.length})</h2>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : folders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center card-shadow border border-gray-100 border-dashed">
                        <p className="text-gray-500">No folders yet. Create your first one above!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folders.map((folder) => (
                            <div
                                key={folder._id}
                                onDoubleClick={() => startViewing(folder)}
                                className={`bg-white rounded-2xl p-5 card-shadow border transition-all group hover:-translate-y-1 cursor-pointer ${editingFolderId === folder._id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-100 hover:border-primary-200'}`}
                                title="Double-click to view contents"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-primary-50 rounded-xl">
                                        <FolderPlus className="w-6 h-6 text-primary-500" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                startEditing(folder)
                                            }}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-500 transition-colors"
                                            title="Edit Folder"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (window.confirm('Delete this folder?')) deleteMutation.mutate(folder._id)
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete Folder"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{folder.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">{folder.description || 'No description'}</p>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary-400" />
                                        <span>{folder.entityIds?.length || 0} Contacts</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}


export default FolderManager
