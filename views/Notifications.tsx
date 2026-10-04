import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Card, Button } from '../components/Shared';
import { Bell, AlertTriangle, TrendingUp, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';

const NotificationsView = () => {
  const context = useContext(AppContext)!;
  const { notifications, setData, navigate } = context;

  const markAsRead = (id: string) => {
    setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const markAllRead = () => {
    setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  const handleAction = (notif: any) => {
      markAsRead(notif.id);
      if (notif.actionLink) {
          navigate(notif.actionLink);
      }
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to delete all notifications?")) {
        setData(prev => ({
            ...prev,
            notifications: prev.notifications.filter(n => n.profileId !== context.activeProfileId)
        }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">Growth Command Center</h2>
            <p className="text-sm text-gray-500">AI Alerts, Stagnation Warnings & Networking Opportunities.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={markAllRead}>Mark All Read</Button>
            <Button variant="secondary" onClick={clearAll} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100">
                <Trash2 size={16} className="mr-1"/> Clear All
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 && (
            <div className="text-center py-10 opacity-50">
                <Bell size={48} className="mx-auto mb-2" />
                <p>No new alerts. Keep pushing.</p>
            </div>
        )}

        {notifications.map((notif) => (
            <Card key={notif.id} className={`border-l-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${notif.read ? 'opacity-60 grayscale-[50%]' : 'opacity-100 shadow-md'} ${
                notif.type === 'danger' ? 'border-l-red-500' : notif.type === 'warning' ? 'border-l-yellow-500' : notif.type === 'success' ? 'border-l-green-500' : 'border-l-blue-500'
            }`}>
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 ${
                        notif.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : notif.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : notif.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                        {notif.type === 'danger' ? <AlertTriangle size={24}/> : notif.type === 'warning' ? <AlertTriangle size={24}/> : notif.type === 'success' ? <TrendingUp size={24}/> : <Bell size={24}/>}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <h4 className="font-bold text-base sm:text-sm">{notif.title}</h4>
                             <span className="text-[10px] sm:text-xs font-medium text-gray-400 mt-0.5">{new Date(notif.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 mt-1.5 whitespace-pre-line leading-relaxed">{notif.message}</p>
                        
                        <div className="flex gap-4 mt-3">
                             {!notif.read && (
                                <button onClick={() => markAsRead(notif.id)} className="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-1 transition-colors">
                                    <CheckCircle2 size={12}/> Mark as Read
                                </button>
                             )}
                             {notif.actionLink && (
                                 <button onClick={() => handleAction(notif)} className="text-xs font-bold text-primary hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                     Take Action <ArrowRight size={12}/>
                                 </button>
                             )}
                             <button onClick={() => context.deleteNotification(notif.id)} className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors ml-auto">
                                 <Trash2 size={12} /> Delete
                             </button>
                        </div>
                    </div>
                </div>
            </Card>
        ))}
      </div>
    </div>
  );
};

export default NotificationsView;