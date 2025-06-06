import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Descriptions, Spin, Row, Col, DatePicker, Select, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fetchAllSystemLessonsApi, fetchLessonByIdApi, updateLessonApi, createLessonApi, deleteLessonApi } from '../../util/api'; // Import the shared API function and fetchLessonByIdApi

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const LessonManagement = () => {
    const navigate = useNavigate();
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [filterForm] = Form.useForm();
    const [editingLesson, setEditingLesson] = useState(null);
    const [filters, setFilters] = useState({});
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [selectedLessonDetails, setSelectedLessonDetails] = useState(null);
    const [loadingViewDetails, setLoadingViewDetails] = useState(false);

    const handleFilterSubmit = (values) => {
        const newFilters = { ...values };

        if (newFilters.createdDate) {
            newFilters.createdFrom = newFilters.createdDate[0].startOf('day').toISOString();
            newFilters.createdTo = newFilters.createdDate[1].endOf('day').toISOString();
        }
        delete newFilters.createdDate;

        if (newFilters.updatedDate) {
            newFilters.updatedFrom = newFilters.updatedDate[0].startOf('day').toISOString();
            newFilters.updatedTo = newFilters.updatedDate[1].endOf('day').toISOString();
        }
        delete newFilters.updatedDate;

        const cleanedFilters = {};
        Object.keys(newFilters).forEach(key => {
            if (newFilters[key] !== null && newFilters[key] !== undefined && newFilters[key] !== '') {
                cleanedFilters[key] = newFilters[key];
            }
        });

        setFilters(cleanedFilters);
        fetchLessons(1, pagination.pageSize, cleanedFilters);
    };

    const handleFilterReset = () => {
        filterForm.resetFields();
        setFilters({});
        fetchLessons(1, pagination.pageSize, {});
    };

    const columns = [
        {
            title: 'Tên bài học',
            dataIndex: 'title',
            key: 'title',
            width: 220,
            ellipsis: true,
            align: 'center',
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 300,
            ellipsis: true,
            align: 'center',
            render: (description) => description || 'Chưa có mô tả',
        },
        {
            title: 'Số khóa học',
            dataIndex: 'courseCount',
            key: 'courseCount',
            width: 100,
            align: 'center',
        },
        {
            title: 'Giảng viên',
            dataIndex: ['createdBy', 'username'],
            key: 'instructorName',
            width: 150,
            ellipsis: true,
            align: 'center',
            render: (username, record) => record.createdBy ? record.createdBy.username : 'N/A',
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="dashed"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Xem giao diện học viên">
                        <Button
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
                            onClick={() => navigate(`/admin/student-lesson-view/${record.id}`)}
                        />
                    </Tooltip>
                    <Tooltip title="Sửa bài học">
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa bài học">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const fetchLessons = async (page = 1, pageSize = 10, currentFilters = filters) => {
        setLoading(true);
        try {
            // The shared fetchAllSystemLessonsApi will use the customized Axios instance,
            // which should handle token and base URL automatically.
            const params = { page: page - 1, size: pageSize, ...currentFilters };
            const apiResponse = await fetchAllSystemLessonsApi(params);

            if (apiResponse && typeof apiResponse.code !== 'undefined') {
                if (apiResponse.code === 1000 && apiResponse.result) {
                    setLessons(apiResponse.result.content || []);
                    setPagination({
                        current: (apiResponse.result.pageable?.pageNumber || 0) + 1,
                        pageSize: apiResponse.result.pageable?.pageSize || pageSize,
                        total: apiResponse.result.totalElements || 0,
                    });
                } else {
                    message.error(apiResponse.message || 'Không thể tải danh sách bài học từ API.');
                }
            } else {
                message.error('Phản hồi không hợp lệ từ API khi tải danh sách bài học.');
            }
        } catch (error) {
            console.error("Fetch lessons error:", error);
            let errorMessage = 'Không thể tải danh sách bài học.';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            } else if (error.data && error.data.message) { // If error itself contains data.message
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons(pagination.current, pagination.pageSize);
    }, []);

    const handleViewDetails = async (lessonSummary) => {
        setViewModalVisible(true);
        setLoadingViewDetails(true);
        setSelectedLessonDetails(null);
        try {
            const apiResponse = await fetchLessonByIdApi(lessonSummary.id);
            if (apiResponse && apiResponse.code === 1000 && apiResponse.result) {
                setSelectedLessonDetails(apiResponse.result);
            } else {
                message.error(apiResponse?.message || 'Không thể tải chi tiết bài học.');
                setViewModalVisible(false);
            }
        } catch (error) {
            console.error("Fetch lesson details error:", error);
            let errorMessage = 'Lỗi khi tải chi tiết bài học.';
            if (error.response?.data?.message) errorMessage = error.response.data.message;
            else if (error.data?.message) errorMessage = error.data.message;
            else if (error.message) errorMessage = error.message;
            message.error(errorMessage);
            setViewModalVisible(false);
        } finally {
            setLoadingViewDetails(false);
        }
    };

    const handleEdit = async (lesson) => {
        setEditingLesson(lesson);
        form.resetFields();
        setModalVisible(true);
        try {
            const apiResponse = await fetchLessonByIdApi(lesson.id);
            if (apiResponse && apiResponse.code === 1000 && apiResponse.result) {
                form.setFieldsValue(apiResponse.result);
            } else {
                message.error(apiResponse?.message || 'Không thể tải chi tiết bài học để chỉnh sửa.');
                setModalVisible(false);
            }
        } catch (error) {
            console.error("Fetch lesson details for edit error:", error);
            message.error('Lỗi khi tải chi tiết bài học để chỉnh sửa.');
            setModalVisible(false);
        }
    };

    const handleDelete = (lesson) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc muốn xóa bài học "${lesson.title}" không? Hành động này không thể hoàn tác.`,
            okText: 'Xóa',
            cancelText: 'Hủy',
            okType: 'danger',
            async onOk() {
                try {
                    const response = await deleteLessonApi(lesson.id);
                    if (response && response.code === 1000) {
                        message.success('Xóa bài học thành công');
                        fetchLessons(pagination.current, pagination.pageSize);
                    } else {
                        message.error(response?.message || 'Không thể xóa bài học.');
                    }
                } catch (error) {
                    console.error("Delete lesson error:", error);
                    let errorMessage = 'Không thể xóa bài học.';
                    if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.data?.message) {
                        errorMessage = error.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    message.error(errorMessage);
                }
            }
        });
    };

    const handleSubmit = async (values) => {
        try {
            if (editingLesson) {
                const response = await updateLessonApi(editingLesson.id, values);
                if (response && response.code === 1000) {
                    message.success('Cập nhật bài học thành công');
                } else {
                    message.error(response?.message || 'Không thể cập nhật bài học.');
                    return;
                }
            } else {
                const response = await createLessonApi(values);
                if (response && response.code === 1000) {
                    message.success('Tạo bài học thành công');
                } else {
                    message.error(response?.message || 'Không thể tạo bài học.');
                    return;
                }
            }
            setModalVisible(false);
            form.resetFields();
            setEditingLesson(null);
            fetchLessons(pagination.current, pagination.pageSize);
        } catch (error) {
            console.error("Submit error:", error);
            let errorMessage = 'Có lỗi xảy ra';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            message.error(errorMessage);
        }
    };

    const handleTableChange = (newPagination) => {
        fetchLessons(newPagination.current, newPagination.pageSize);
    };

    return (
        <div>
            <Form
                form={filterForm}
                onFinish={handleFilterSubmit}
                layout="vertical"
                style={{ marginBottom: 24, padding: '16px 24px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #d9d9d9' }}
            >
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item name="title" label="Tên bài học">
                            <Input placeholder="Tìm theo tên bài học" allowClear />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="createdBy" label="Người tạo">
                            <Input placeholder="Tìm theo username người tạo" allowClear />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="createdDate" label="Ngày tạo">
                            <RangePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item name="updatedDate" label="Ngày cập nhật">
                            <RangePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={16} style={{ textAlign: 'right', alignSelf: 'flex-end', paddingBottom: '8px' }}>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Lọc
                            </Button>
                            <Button onClick={handleFilterReset}>
                                Xóa bộ lọc
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Form>

            <div style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingLesson(null);
                        form.resetFields();
                        setModalVisible(true);
                    }}
                >
                    Thêm bài học
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={lessons}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
            />

            <Modal
                title={editingLesson ? 'Sửa bài học' : 'Thêm bài học'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setEditingLesson(null);
                }}
                footer={null}
                width={800}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="title"
                        label="Tên bài học"
                        rules={[{ required: true, message: 'Vui lòng nhập tên bài học' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Mô tả ngắn"
                        rules={[{ required: false, message: 'Vui lòng nhập mô tả ngắn' }]}
                    >
                        <TextArea rows={2} placeholder="Mô tả ngắn gọn về bài học..." />
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Nội dung chi tiết"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết' }]}
                    >
                        <TextArea rows={6} placeholder="Nội dung chi tiết của bài học..." />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingLesson ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                            <Button onClick={() => {
                                setModalVisible(false);
                                form.resetFields();
                                setEditingLesson(null);
                            }}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {viewModalVisible && (
                <Modal
                    title="Chi tiết bài học"
                    open={viewModalVisible}
                    onCancel={() => {
                        setViewModalVisible(false);
                        setSelectedLessonDetails(null);
                        setLoadingViewDetails(false);
                    }}
                    footer={[
                        <Button key="close" onClick={() => {
                            setViewModalVisible(false);
                            setSelectedLessonDetails(null);
                            setLoadingViewDetails(false);
                        }}>
                            Đóng
                        </Button>,
                    ]}
                    width={800}
                >
                    {loadingViewDetails ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Spin size="large" />
                            <p>Đang tải chi tiết bài học...</p>
                        </div>
                    ) : selectedLessonDetails ? (
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="ID">{selectedLessonDetails.id}</Descriptions.Item>
                            <Descriptions.Item label="Tên bài học">{selectedLessonDetails.title}</Descriptions.Item>
                            <Descriptions.Item label="Số khóa học chứa bài học">{selectedLessonDetails.courseCount}</Descriptions.Item>
                            <Descriptions.Item label="Mô tả ngắn">{selectedLessonDetails.description || 'Chưa có mô tả'}</Descriptions.Item>
                            <Descriptions.Item label="Nội dung chi tiết">{selectedLessonDetails.content || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{selectedLessonDetails.createdAt ? new Date(selectedLessonDetails.createdAt).toLocaleString() : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Cập nhật lần cuối">{selectedLessonDetails.updatedAt ? new Date(selectedLessonDetails.updatedAt).toLocaleString() : 'N/A'}</Descriptions.Item>
                            {selectedLessonDetails.createdBy && (
                                <>
                                    <Descriptions.Item label="Người tạo (Username)">{selectedLessonDetails.createdBy.username}</Descriptions.Item>
                                    <Descriptions.Item label="Người tạo (Tên)">{`${selectedLessonDetails.createdBy.lastName || ''} ${selectedLessonDetails.createdBy.firstName || ''}`.trim() || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Người tạo (Email)">{selectedLessonDetails.createdBy.email || 'N/A'}</Descriptions.Item>
                                </>
                            )}
                        </Descriptions>
                    ) : (
                        <p>Không thể tải hoặc không tìm thấy chi tiết bài học.</p>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default LessonManagement; 