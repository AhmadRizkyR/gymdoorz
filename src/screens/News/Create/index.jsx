import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Gallery, CloseSquare } from 'iconsax-react-native';
import { colors } from '../../../../assets/theme';
import { TRadius } from '../../../../assets/TStyle';
import { PageWrapper } from '../../../components';
import axios from 'axios';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import * as Notifications from 'expo-notifications';

export default function CreateNews({ navigation }) {
    // const navigation = useNavigation();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        img: null
    });
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState(null);

    const handleChange = (name, value) => {
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'We need gallery permission to pick images');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            handleChange('img', result.assets[0].uri);
            setImage(result.assets[0].uri);
        }
    };

    const removeImage = () => {
        handleChange('img', null);
        setImage(null);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            Alert.alert('Error', 'Judul dan deskripsi harus diisi');
            return;
        }

        setIsLoading(true);

        let filename = image.substring(image.lastIndexOf('/') + 1);
        const extension = filename.split('.').pop();
        const name = filename.split('.').slice(0, -1).join('.');
        filename = name + Date.now() + '.' + extension;


        try {
            // 1. Upload gambar terlebih dahulu jika ada
            // let imageUrl = null;
            // if (formData.image) {
            //     imageUrl = await uploadImageToAPI();
            // }
            const imageFormData = new FormData();
            imageFormData.append('file', {
                uri: image,
                type: `image/${extension}`,
                name: filename,
            });

            const result = await fetch('https://backend-file-praktikum.vercel.app/upload/', {
                method: 'POST',
                body: imageFormData,
            });

            if (result.status !== 200) {
                throw new Error("failed to upload image");
            }

            const { url } = await result.json();
            let newImageUrl = url;

            // 2. Kirim data berita ke API
            const newsData = {
                title: formData.title,
                description: formData.description,
                // img: imageUrl || 'https://default-image-url.com/default.jpg',
                img: newImageUrl,
                createdAt: new Date().toISOString()
            };

            const newsRef = collection(db, 'News');

            addDoc(newsRef, newsData);

            await scheduleNotification();

            Alert.alert('Success', 'Berita berhasil dibuat');
            navigation.goBack();
        } catch (error) {
            console.error('Error:', error);
            Alert.alert('Error', 'Gagal membuat berita');
        } finally {
            setIsLoading(false);
        }
    };

    const scheduleNotification = async (duration = 5) => {
        try {
            // Schedule notification for 1 minute after news is published
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "News Published!",
                    body: `News "${formData.title}" has been successfully published`,
                    data: { newsTitle: formData.title },
                },
                trigger: { seconds: duration }, // 1 minute later
            });

            // You can schedule additional notifications here
            // For example, a reminder 1 day later
            // await Notifications.scheduleNotificationAsync({
            //     content: {
            //         title: "News Update Reminder",
            //         body: `Remember to check the engagement on your news "${formData.title}"`,
            //         data: { newsTitle: formData.title },
            //     },
            //     trigger: { seconds: 86400 }, // 24 hours later
            // });
        } catch (error) {
            console.error('Error scheduling notification:', error);
        }
    };

    return (
        <PageWrapper>
            <View style={styles.container}>
                {/* Header */}
                {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color={colors.textPrimary} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create News</Text>
                <View style={{ width: 24 }} />
            </View> */}

                <ScrollView contentContainerStyle={styles.formContainer}>
                    {/* Judul Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter news title..."
                            value={formData.title}
                            onChangeText={(text) => handleChange('title', text)}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* Deskripsi Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Write your news description..."
                            value={formData.description}
                            onChangeText={(text) => handleChange('description', text)}
                            multiline
                            numberOfLines={4}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* Gambar Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Image</Text>
                        {/* <TextInput
                            style={[styles.input]}
                            placeholder="Put image url"
                            value={formData.img}
                            onChangeText={(text) => handleChange('img', text)}
                            placeholderTextColor={colors.textSecondary}
                        /> */}
                        {formData.img ? ( // Gunakan formData.img yang konsisten
                            <View style={styles.imagePreviewContainer}>
                                <Image
                                    source={{ uri: formData.img }} // Perbaiki dari formData.image ke formData.img
                                    style={styles.imagePreview}
                                />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={removeImage}
                                >
                                    <CloseSquare color="white" size={20} variant="Bold" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.imagePicker}
                                onPress={pickImage}
                            >
                                <Gallery color={colors.primary} size={32} />
                                <Text style={styles.imagePickerText}>Pilih Gambar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        <Text style={styles.submitButtonText}>
                            {isLoading ? 'Saving...' : 'Publish News'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </PageWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    formContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    input: {
        backgroundColor: colors.base,
        borderRadius: TRadius.sm,
        padding: 12,
        color: colors.textSecondary,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    imagePicker: {
        backgroundColor: colors.base,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: TRadius.sm,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerText: {
        marginTop: 8,
        color: colors.primary,
        fontWeight: '500',
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: TRadius.sm,
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: colors.danger,
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: TRadius.sm,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});