import React from "react";
import { Table, Button, Modal, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import OutletForm from "./OutletForm";
import "../css/outletForm.css"; // Import the custom CSS

const OutletDetail = ({ data, onChange }) => {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null); // State for the item being edited
  const [pagination, setPagination] = React.useState({
    current: 1,
    pageSize: 6,
  }); // State for pagination

  const showModal = (item = null) => {
    setEditingItem(item);
    setIsModalVisible(true);
  };

  const handleOk = (newItem) => {
    if (editingItem) {
      // Update existing item
      const updatedItems = data.items.map((item) =>
        item.id === editingItem.id ? newItem : item
      );
      onChange({ ...data, items: updatedItems });
    } else {
      // Add new item
      const newItems = [
        ...data.items,
        { ...newItem, id: Date.now() }, // Generate unique ID using timestamp
      ];
      onChange({ ...data, items: newItems });
    }
    setIsModalVisible(false);
    setEditingItem(null); // Reset editingItem
    message.success("Outlet data saved successfully");
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingItem(null); // Reset editingItem
  };

  const handleRemove = (id) => {
    const updatedItems = data.items.filter((item) => item.id !== id);
    onChange({ ...data, items: updatedItems });
    message.success("Outlet removed successfully");
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const columns = [
    {
      title: "Outlet Name",
      dataIndex: "branch_name",
      key: "branch_name",
    },
    {
      title: "FSSAI No",
      dataIndex: "fssai_license_number",
      key: "fssai_license_number",
    },
    {
      title: "No of Food Handlers",
      dataIndex: "no_of_food_handlers",
      key: "no_of_food_handlers",
    },
    {
      title: "Contact Number",
      dataIndex: "contact_number",
      key: "contact_number",
    },
    {
      title: "Contact Person",
      dataIndex: "contact_person",
      key: "contact_person",
    },
    {
      title: "GST NO.",
      dataIndex: "gst_number",
      key: "gst_number",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          icon={<DeleteOutlined style={{ color: "red" }} />}
          onClick={() => handleRemove(record.id)}
        />
      ),
    },
  ];

  return (
    <>
      <div className="min-h-screen flex flex-col justify-between">
        <div className="w-3/4 mx-auto flex-grow">
          <div className="flex justify-between items-center m-6">
            <h2 className="text-lg font-semibold">Outlet List</h2>
            <div className="space-x-2">
              <Button
                type="primary"
                shape="round"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                Add Outlet
              </Button>
            </div>
          </div>
          <div className="m-6 flex-grow">
            <Table
              columns={columns}
              dataSource={data.items}
              rowKey={(record) => record.id}
              pagination={pagination}
              onChange={handleTableChange}
            />
          </div>
          <OutletForm
            isModalVisible={isModalVisible}
            handleOk={handleOk}
            handleCancel={handleCancel}
            item={editingItem}
          />
        </div>
      </div>
    </>
  );
};

export default OutletDetail;
