import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, Easing } from 'react-native';
import { User, BusOperator, Route } from '../types';
import * as api from '../api';
import { BusIcon, ProfileIcon } from '../components/icons';

interface TransportationScreenProps {
  user: User;
}

const TransportationScreen: React.FC<TransportationScreenProps> = ({ user }) => {
    const [details, setDetails] = useState<{ route: Route; operator: BusOperator | undefined } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.parentId) { setLoading(false); return; }
        api.getParentTransportationDetails(user.parentId)
            .then(data => {
                if (data && data.route && data.operator) {
                    setDetails(data);
                } else {
                    setDetails(null);
                }
            })
            .catch(() => setDetails(null))
            .finally(() => setLoading(false));
    }, [user.parentId]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#dc2626" /></View>;
    }

    if (!details || !details.operator) {
        return <View style={styles.center}><Text>الطالب غير مسجل في خدمة النقل.</Text></View>;
    }

    const { route, operator } = details;

    const animX = useRef(new Animated.Value(0)).current;
    const animY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const path = [
            { x: 0, y: 0 },
            { x: 60, y: -10 },
            { x: 120, y: 0 },
            { x: 180, y: 15 },
            { x: 240, y: 0 },
        ];
        const seq = path.map((p, i) => Animated.timing(animX, { toValue: p.x, duration: 800, easing: Easing.linear, useNativeDriver: true }));
        const seqY = path.map((p, i) => Animated.timing(animY, { toValue: p.y, duration: 800, easing: Easing.linear, useNativeDriver: true }));
        Animated.loop(Animated.sequence(seq)).start();
        Animated.loop(Animated.sequence(seqY)).start();
    }, [animX, animY]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>مسار: {route.name}</Text>
                <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapText}>تتبُّع الحافلة (محاكاة)</Text>
                    <Animated.View style={{ transform: [{ translateX: animX }, { translateY: animY }] }}>
                        <BusIcon size={40} color="#dc2626" />
                    </Animated.View>
                </View>
            </View>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>معلومات السائق</Text>
                <View style={styles.infoRow}><ProfileIcon size={18} color="#6b7280" /><Text style={styles.infoText}>الاسم: {operator.name}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>الهاتف:</Text><Text style={[styles.infoText, {color: '#dc2626'}]}>{operator.phone}</Text></View>
            </View>
             <View style={styles.card}>
                <Text style={styles.cardTitle}>معلومات الحافلة</Text>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>رقم اللوحة:</Text><Text style={styles.infoText}>{operator.busPlateNumber}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>الموديل:</Text><Text style={styles.infoText}>{operator.busModel}</Text></View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingVertical: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 16, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, textAlign: 'right' },
    mapPlaceholder: { height: 180, backgroundColor: '#f3f4f6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    mapText: { color: '#6b7280', marginBottom: 10 },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 6 },
    infoLabel: { color: '#6b7280', fontSize: 14 },
    infoText: { color: '#111827', fontSize: 16, marginRight: 8, fontWeight: '600' },
});

export default TransportationScreen;
