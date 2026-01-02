import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { User, ParentRequest, RequestStatus, RequestType } from '../types';
import * as api from '../api';
import { PlusIcon } from '../components/icons';

interface RequestsScreenProps {
  user: User;
}

const statusColorMap: { [key in RequestStatus]: string } = {
  [RequestStatus.Pending]: '#f59e0b',
  [RequestStatus.Approved]: '#10b981',
  [RequestStatus.Rejected]: '#ef4444',
};

const RequestsScreen: React.FC<RequestsScreenProps> = ({ user }) => {
    const [requests, setRequests] = useState<ParentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newRequest, setNewRequest] = useState({ type: RequestType.Leave, details: '' });

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentRequests(user.parentId)
            .then(setRequests)
            .finally(() => setLoading(false));
    }, [user.parentId]);

    const handleSubmit = async () => {
        if (!user.parentId || !newRequest.details.trim()) return;
        await api.submitParentRequest(user.parentId, newRequest);
        const updatedRequests = await api.getParentRequests(user.parentId);
        setRequests(updatedRequests);
        setIsModalVisible(false);
        setNewRequest({ type: RequestType.Leave, details: '' });
    };

    const renderItem = ({ item }: { item: ParentRequest }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.requestType}>{item.type}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColorMap[item.status] }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.details}>{item.details}</Text>
            <Text style={styles.date}>{item.submissionDate}</Text>
        </View>
    );

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={requests}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<View style={styles.center}><Text>لا توجد طلبات سابقة.</Text></View>}
            />
            <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
                <PlusIcon color="#fff" size={24} />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>تقديم طلب جديد</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="تفاصيل الطلب..."
                            multiline
                            value={newRequest.details}
                            onChangeText={text => setNewRequest(prev => ({ ...prev, details: text }))}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}><Text style={styles.buttonText}>إلغاء</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}><Text style={styles.submitButtonText}>إرسال</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    requestType: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    statusBadge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    details: { color: '#374151', textAlign: 'right', marginBottom: 12 },
    date: { fontSize: 12, color: '#9ca3af', textAlign: 'left' },
    fab: { position: 'absolute', bottom: 30, left: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', textAlign: 'right' },
    modalButtons: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: 20 },
    buttonText: { color: '#6b7280', fontSize: 16 },
    submitButton: { backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default RequestsScreen;
