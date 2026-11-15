'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { useAppStore } from '@/app/lib/store';

export default function RealtimeListener() {
  const { currentUser, syncFromSupabase } = useAppStore();

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser) return;

    console.log('Menghubungkan Supabase Realtime...');
    
    // Sinkronisasi data saat komponen pertama kali dimuat
    syncFromSupabase();

    // Listener untuk Chat Messages
    const messageSubscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const newMsg = payload.new;
        const state = useAppStore.getState();
        const msgExists = state.chatMessages.find(m => m.id === newMsg.id);
        
        if (!msgExists) {
          useAppStore.setState({
            chatMessages: [...state.chatMessages, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderName: newMsg.sender_name,
              senderRole: newMsg.sender_role as any,
              message: newMsg.message,
              timestamp: newMsg.timestamp,
              chatRoomId: newMsg.chat_room_id,
              attachmentType: newMsg.attachment_type || undefined,
              attachmentData: newMsg.attachment_data || undefined,
              attachmentName: newMsg.attachment_name || undefined,
              attachmentMime: newMsg.attachment_mime || undefined,
            }],
            // Update last message in chatRoom
            chatRooms: state.chatRooms.map(r => 
              r.id === newMsg.chat_room_id 
                ? { ...r, lastMessage: newMsg.message, lastMessageTime: newMsg.timestamp, unreadCount: r.unreadCount + 1 }
                : r
            )
          });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
        const deletedMsgId = payload.old.id;
        useAppStore.setState(state => ({
          chatMessages: state.chatMessages.filter(m => m.id !== deletedMsgId)
        }));
      })
      .subscribe();

    // Listener untuk Notifikasi
    const notificationSubscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = payload.new;
        
        // Hanya tambahkan jika notifikasi ini ditujukan untuk user yang sedang login
        if (newNotif.target_user_id === currentUser.id) {
          const state = useAppStore.getState();
          const notifExists = state.notifications.find(n => n.id === newNotif.id);
          
          if (!notifExists) {
            useAppStore.setState({
              notifications: [{
                id: newNotif.id,
                title: newNotif.title,
                message: newNotif.message,
                date: newNotif.date,
                read: newNotif.read,
                type: newNotif.type as any,
                targetUserId: newNotif.target_user_id,
                relatedId: newNotif.related_id
              }, ...state.notifications]
            });
          }
        }
      })
      .subscribe();

    // Listener untuk Prestasi
    const achievementSubscription = supabase
      .channel('public:achievements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievements' }, payload => {
        const newAch = payload.new;
        const state = useAppStore.getState();
        const achExists = state.achievements.find(a => a.id === newAch.id);
        
        if (!achExists) {
          useAppStore.setState({
            achievements: [{
              id: newAch.id,
              studentName: newAch.student_name,
              studentClass: newAch.student_class,
              title: newAch.title,
              description: newAch.description,
              date: newAch.date,
              category: newAch.category
            }, ...state.achievements]
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(achievementSubscription);
    };
  }, [currentUser]);

  return null;
}
