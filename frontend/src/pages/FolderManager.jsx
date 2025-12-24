import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFolders, createFolder, deleteFolder, getEntities, syncFromTelegram } from '../services/api'
import { FolderPlus, Trash2, Users, Loader2, Search, Hash, Radio, CheckCircle2, X, RefreshCw, Download } from 'lucide-react'

function FolderManager() {
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

    const createMutation = useMutation({
        mutationFn: createFolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            setNewFolderName('')
            setNewFolderDesc('')
            setSelectedEntities([])
            setShowEntitySelector(false)
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

    const handleCreate = (e) => {
        e.preventDefault()
        if (!newFolderName.trim()) return
        createMutation.mutate({
            name: newFolderName.trim(),
            description: newFolderDesc.trim(),
            entityIds: selectedEntities
        })
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
            case 'channel': return <Radio className="w-4 h-4 text-blue-400" />
            case 'group': return <Hash className="w-4 h-4 text-green-400" />
            default: return <Users className="w-4 h-4 text-purple-400" />
        }
    }

    const [viewFolder, setViewFolder] = useState(null)

    const folderEntities = viewFolder
        ? entities.filter(e => viewFolder.entityIds.includes(e.telegramId))
        : []

    return (
        <div className="space-y-8 animate-in">
            <header>
                <h1 className="text-3xl font-bold mb-2">Folder Manager</h1>
                <p className="text-dark-400">Organize your Telegram contacts into broadcast groups.</p>
            </header>

            {/* Create Folder Form */}
            <form onSubmit={handleCreate} className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-primary-400" />
                    Create New Folder
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={newFolderDesc}
                        onChange={(e) => setNewFolderDesc(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                    />
                </div>

                {/* Entity Selection Section */}
                <div className="border border-dark-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary-400" />
                            Select Channels & Groups
                            {selectedEntities.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold">
                                    {selectedEntities.length} selected
                                </span>
                            )}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowEntitySelector(!showEntitySelector)}
                            className="text-sm text-primary-400 hover:text-primary-300"
                        >
                            {showEntitySelector ? 'Hide' : 'Show'} Selector
                        </button>
                    </div>

                    {showEntitySelector && (
                        <div className="space-y-3">
                            {/* Category Filter */}
                            <div className="flex gap-1 p-1 bg-dark-900/50 rounded-xl border border-dark-700">
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
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat.id
                                            ? 'bg-primary-500 text-white shadow-lg'
                                            : 'text-dark-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                        {selectedCategory === cat.id && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px]">
                                                {entities.filter(e => cat.id === 'all' || e.type === cat.id).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Search and Actions */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${selectedCategory === 'all' ? 'everything' : selectedCategory + 's'}...`}
                                        value={entitySearch}
                                        onChange={(e) => setEntitySearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-800 border border-dark-600 focus:border-primary-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => syncMutation.mutate()}
                                    disabled={syncMutation.isPending}
                                    className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1"
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
                                    className="px-3 py-2 rounded-lg bg-dark-800 text-xs font-medium hover:bg-dark-700 transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="px-3 py-2 rounded-lg bg-dark-800 text-xs font-medium hover:bg-dark-700 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Entity List */}
                            <div className="max-h-64 overflow-y-auto space-y-1 border border-dark-700 rounded-lg p-2">
                                {entitiesLoading || syncMutation.isPending ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                                        {syncMutation.isPending && (
                                            <span className="ml-2 text-sm text-dark-400">Syncing from Telegram...</span>
                                        )}
                                    </div>
                                ) : filteredEntities.length === 0 ? (
                                    <div className="py-8 text-center text-dark-400 text-sm">
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
                                                ? 'bg-primary-500/20 border border-primary-500/30'
                                                : 'hover:bg-dark-800 border border-transparent'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selectedEntities.includes(entity.telegramId)
                                                ? 'bg-primary-500 border-primary-500'
                                                : 'border-dark-500'
                                                }`}>
                                                {selectedEntities.includes(entity.telegramId) && (
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
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
                                                <p className="font-medium text-sm truncate">{entity.name}</p>
                                                {entity.username && (
                                                    <p className="text-xs text-dark-400">@{entity.username}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-dark-500 capitalize">{entity.type}</span>
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
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-800 text-xs">
                                        {getEntityIcon(entity.type)}
                                        {entity.name}
                                        <button
                                            type="button"
                                            onClick={() => toggleEntity(id)}
                                            className="ml-1 hover:text-red-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ) : null
                            })}
                            {selectedEntities.length > 5 && (
                                <span className="text-xs text-dark-400">+{selectedEntities.length - 5} more</span>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={createMutation.isPending || !newFolderName.trim()}
                    className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Folder {selectedEntities.length > 0 && `(${selectedEntities.length} entities)`}
                </button>
            </form>

            {/* Existing Folders */}
            <div>
                <h2 className="text-lg font-bold mb-4">Your Folders ({folders.length})</h2>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                    </div>
                ) : folders.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                        <p className="text-dark-400">No folders yet. Create your first one above!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folders.map((folder) => (
                            <div
                                key={folder._id}
                                onClick={() => setViewFolder(folder)}
                                className="glass rounded-2xl p-5 hover:border-primary-500/20 transition-colors group cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{folder.name}</h3>
                                        {folder.description && (
                                            <p className="text-sm text-dark-400 mt-1">{folder.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteMutation.mutate(folder._id)
                                        }}
                                        disabled={deleteMutation.isPending}
                                        className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-dark-400">
                                    <Users className="w-4 h-4" />
                                    <span>{folder.entityIds?.length || 0} contacts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Folder Details Modal */}
            {viewFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setViewFolder(null)}>
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-primary-400" />
                                    {viewFolder.name}
                                </h3>
                                <p className="text-sm text-dark-400 mt-1">
                                    {folderEntities.length} members
                                </p>
                            </div>
                            <button onClick={() => setViewFolder(null)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-2 overflow-y-auto custom-scrollbar">
                            {folderEntities.length > 0 ? (
                                <div className="space-y-1">
                                    {folderEntities.map((entity) => (
                                        <div key={entity.telegramId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800 border border-transparent hover:border-dark-700 transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-dark-400 group-hover:bg-dark-700 group-hover:text-primary-400 transition-colors">
                                                {getEntityIcon(entity.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate text-white">{entity.name}</p>
                                                {entity.username && (
                                                    <p className="text-xs text-dark-400 truncate">@{entity.username}</p>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-dark-500 bg-dark-800 px-2 py-1 rounded-md">
                                                {entity.type}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-dark-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No contacts in this folder.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FolderManager
