import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Radio,
  Button,
  Input,
  Checkbox,
  Tag,
  Space,
  Modal,
  Dropdown,
  Menu,
  ConfigProvider,
  message,
} from "antd";
import {
  DeleteOutlined,
  ExclamationCircleOutlined ,
  MoreOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import AdminDashboard from "../Layout/AdminDashboard";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import SendMailModal from "./SendMail";
import { ExclamationCircleFilled } from "@ant-design/icons";
const { confirm } = Modal;

// Debounce function definition
const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Define your debounce delay (e.g., 300ms)
const debounceDelay = 300;

const ClientApprovalTable = () => {
  const [flattenedTableData, setFlattenedTableData] = useState([]);
  const [sortData, setSortData] = useState("alllist");
  const [selectionType, setSelectionType] = useState("checkbox");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 8, 
      total: 0, 
    },
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);
  const navigate = useNavigate();

  // Toggling
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
    setIsModalOpen(!isModalOpen);
  };

  // Fetch data function
  const fetchData = useCallback(() => {
    setLoading(true);

    // Construct the URL with the businessId included in the path
    const url = "/api/getAllClientDetail";

    axios
      .get(url, {
        params: {
          page: tableParams.pagination.current,
          pageSize: tableParams.pagination.pageSize,
          sort: `${sortData}`,
          keyword: searchKeyword,
        },
      })
      .then((response) => {
        const { data } = response;
        const { data: responseData, total, currentPage } = data;

        const flattenedData = responseData.map((row, index) => ({
          ...row,
          key: `${row._id}-${index}`, 
        }));
        setFlattenedTableData(flattenedData);

        setTableParams((prevState) => ({
          ...prevState,
          pagination: {
            ...prevState.pagination,
            total: total, 
            current: currentPage, 
          },
        }));

        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [
    tableParams.pagination.current,
    tableParams.pagination.pageSize,
    sortData,
    searchKeyword,
  ]);

  const fetchDataWithDebounce = debounce(() => {
    if (searchKeyword.trim()) {
      // Your backend call logic here
      console.log("Fetching data for keyword:", searchKeyword);
    }
  }, debounceDelay);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch data when shouldFetch changes
  useEffect(() => {
    if (shouldFetch) {
      fetchData();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchData]);

  // Pagination
  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      pagination,
      filters,
      ...sorter,
    });
    if (pagination.pageSize !== tableParams.pagination.pageSize) {
      setFlattenedTableData([]);
    }
  };

  // Row Selection
  const rowSelection = {
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedRows(selectedRows);
    },
  };

  // Show confirm Delete
  const showDeleteConfirm = () => {
    confirm({
      title: "Are you sure delete?",
      icon: <ExclamationCircleFilled />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        axios
          .delete("/api/deleteSelectedFields", { data: selectedRows })
          .then((response) => {
            const currentPage = tableParams.pagination.current;
            const pageSize = tableParams.pagination.pageSize;
            const newTotal = tableParams.pagination.total - selectedRows.length;
            const newCurrentPage = Math.min(
              currentPage,
              Math.ceil(newTotal / pageSize)
            );

            setTableParams((prevState) => ({
              ...prevState,
              pagination: {
                ...prevState.pagination,
                total: newTotal,
                current: newCurrentPage,
              },
            }));

            setSelectedRows([]);
            setShouldFetch(true); // Trigger data fetch
            toast.success("Successfully Deleted");
          })
          .catch((error) => {
            console.error("Error deleting rows:", error);
          });
      },
      onCancel() {
        console.log("Cancel");
      },
    });
  };

  //Confimr Approval of client list
const confirmApproval = (id) => {
  // Define a function to handle the approval API call
  const handleApproval = () => {
    axios
      .put(`/api/updateBusinessStatus/${id}`)
      .then((response) => {
        fetchData();
        message.success("Client is Approved");
      })
      .catch((error) => {
        console.error("Approval error:", error);
        message.error("Approval failed");
      });
  };

  // Define a function to handle the rejection API call
  const handleRejection = () => {
    axios
      .delete("/api/deleteSelectedFields", { data: [id] }) // Send ID as an array
      .then((response) => {
        const currentPage = tableParams.pagination.current;
        const pageSize = tableParams.pagination.pageSize;
        const newTotal = tableParams.pagination.total - 1; // Only one row is deleted
        const newCurrentPage = Math.min(
          currentPage,
          Math.ceil(newTotal / pageSize)
        );

        setTableParams((prevState) => ({
          ...prevState,
          pagination: {
            total: newTotal,
            current: newCurrentPage,
          },
        }));

        setShouldFetch(true); // Trigger data fetch
        message.success("Client is Rejected");
      })
      .catch((error) => {
        console.error("Error deleting row:", error);
        message.error("Rejection failed");
      });
  };

  // Show the confirmation modal
  Modal.confirm({
    title: "Approve or Reject?",
    icon: <ExclamationCircleFilled />,
    okText: "Approve",
    okType: "primary",
    cancelText: "Reject",
    cancelType: "danger",
    closable: true,
    onOk() {
      handleApproval(); // Only called when "Approve" is clicked
    },
    onCancel() {
      handleRejection(); // Only called when "Reject" is clicked
    },
  });
};




  // Handle Menu
 const handleMenuClick = (record, { key }) => {
   switch (key) {
     case "view":
       navigate(`/client-profile/update-client/id/${record._id}`);
       break;
     case "approve":
       confirmApproval(record._id);
     default:
       break;
   }
 };

 const menu = (record) => (
   <Menu onClick={(e) => handleMenuClick(record, e)} style={{ padding: "8px" }}>
     <Menu.Item
       key="view"
       style={{ margin: "8px 0", backgroundColor: "#FFE0B2" }}
     >
       <span style={{ color: "#E65100", fontWeight: "bold", fontSize: "12px" }}>
         <EyeOutlined /> View/Update
       </span>
     </Menu.Item>
     <Menu.Item
       key="approve"
       style={{ margin: "8px 0", backgroundColor: "#E0F7FA" }}
     >
       <span style={{ color: "#00796B", fontWeight: "bold", fontSize: "12px" }}>
         <ExclamationCircleOutlined /> Approve
       </span>
     </Menu.Item>
   </Menu>
 );

  const handleInputChange = (event) => {
    if (isModalOpen) return;

    const { value } = event.target;
    setSearchKeyword(value);
  };

  useEffect(() => {
    if (searchKeyword.trim()) {
      fetchDataWithDebounce();
    } else {
      console.log("Resetting fields to normal state");
    }
  }, [searchKeyword, fetchDataWithDebounce]);

  const columns = [
    {
      title: "FBO Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Contact Number",
      dataIndex: "contact_person",
      key: "contact_person",
    },
    {
      title: "Phone Number",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Mail ID",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Outlet",
      dataIndex: "outletCount",
      key: "outletCount",
    },
    {
      title: "Added By",
      dataIndex: "added_by",
      key: "added_by",
      render: (addedBy) => {
        let color;
        if (addedBy === "Manual") {
          color = "volcano";
        } else if (addedBy === "Web Enquiry") {
          color = "green";
        } else {
          color = "geekblue"; 
        }
        return <Tag color={color}>{addedBy.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Created On",
      dataIndex: "created_at",
      key: "created_at",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Dropdown
          overlay={menu(record)}
          trigger={["click"]}
          placement="bottomLeft"
          arrow
          danger
        >
          <Button type="link" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <AdminDashboard>
      <div className="bg-blue-50 m-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Client Approval</h2>
          <div className="space-x-2">
            <Space wrap>
              <Button
                onClick={showDeleteConfirm}
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                shape="round"
              >
                Delete
              </Button>
            </Space>
          </div>
        </div>

        <div className="flex justify-between my-4">
          <ConfigProvider
            theme={{
              components: {
                Radio: {
                  buttonBorderWidth: 0, 
                },
              },
            }}
          >
            <Radio.Group
              value={sortData}
              onChange={(e) => setSortData(e.target.value)}
            >
              <Radio.Button
                value="alllist"
                style={{
                  backgroundColor:
                    sortData === "alllist" ? "transparent" : "white",
                  color: sortData === "alllist" ? "black" : "black",
                  padding: "0 16px",
                  height: "32px",
                  lineHeight: "30px",
                  border: "1px solid #d3d3d3",
                  fontWeight: sortData === "alllist" ? "500" : "normal",
                }}
              >
                All List
              </Radio.Button>
              <Radio.Button
                value="newlyadded"
                style={{
                  backgroundColor:
                    sortData === "newlyadded" ? "transparent" : "white",
                  color: sortData === "newlyadded" ? "black" : "black",
                  padding: "0 16px",
                  height: "32px",
                  lineHeight: "30px",
                  border: "1px solid #d3d3d3",
                  fontWeight: sortData === "alllist" ? "normal" : "500",
                }}
              >
                Newly Added
              </Radio.Button>
            </Radio.Group>
          </ConfigProvider>

          <div className="space-x-2">
            <Input
              size="default"
              placeholder="Search by FBO Name, Phone Number, etc."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={handleInputChange}
              style={{ width: 300 }}
            />
          </div>
        </div>

        <div>
          <ConfigProvider
            theme={{
              token: {
                colorTextHeading: "#4A5568", 
                colorText: "#4A5568",
                fontWeight: "bold", 
              },
              components: {
                Table: {
                  colorText: "#4A5568", 
                  fontWeight: "bold", 
                },
              },
            }}
          >
            <Table
              rowSelection={{
                type: selectionType,
                ...rowSelection,
              }}
              columns={columns}
              dataSource={flattenedTableData}
              rowKey={(record) => record.key}
              pagination={tableParams.pagination}
              loading={loading}
              onChange={handleTableChange}
            />
          </ConfigProvider>
        </div>
      </div>
      <SendMailModal visible={isModalVisible} onCancel={toggleModal} />
    </AdminDashboard>
  );
};

export default ClientApprovalTable;
