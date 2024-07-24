import React, { useState, useEffect } from "react";
import {
  Modal,
  DatePicker,
  Form,
  InputNumber,
  Input,
  Button,
  Table,
  message
} from "antd";
import axios from "axios";
import "../css/GenerateProposalModal.css";
import GenerateSendMail from "./GenerateSendMail";
import moment from "moment";

const GenerateInvoiceModal = ({ visible, onOk, onCancel, proposalId }) => {
  const [form] = Form.useForm();
  const [showForm, setShowForm] = useState(false);
  const [showSendMailModal, setShowSendMailModal] = useState(false);
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [invoiceId,setInvoiceId]=useState([]);
  const [initialValuesLoaded, setInitialValuesLoaded] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(moment());

useEffect(() => {
  if (visible) {
    // Fetch outlets when the modal is visible
    axios
      .get(`/api/proposal/getOutletsByProposalId/${proposalId}`)
      .then((response) => {
        setOutlets(response.data);
      })
      .catch((error) => {
        console.error("Error fetching outlets:", error);
      });

    // Fetch proposal data to initialize the form
    axios
      .get(`/api/invoice/getProposalById/${proposalId}`)
      .then((response) => {
        const {
          address,
          fbo_name,
          proposal_date,
          proposal_number,
         
          pincode,
        } = response.data;

        form.setFieldsValue({
          address,
          fbo_name,
          proposal_date: proposal_date ? moment(proposal_date) : null,
          proposal_number,
         
          pincode,
        });
        setInitialValuesLoaded(true);
      })
      .catch((error) => {
        console.error("Error fetching proposal data:", error);
      });

    // Fetch invoice number
    const fetchInvoiceId = async () => {
      try {
        const response = await axios.get("/api/invoice/generateInvoiceNumber");
        setInvoiceId(response.data.invoice_number);
      } catch (error) {
        console.error("Error fetching InvoiceId", error);
      }
    };

    fetchInvoiceId();
  }
}, [visible, proposalId, form]);





  const handleCancel = () => {
    onCancel();
    form.resetFields();
    setShowForm(false);
  };


  const handleSelect = (record, selected) => {
    const updatedSelectedOutlets = selected
      ? [...selectedOutlets, record]
      : selectedOutlets.filter((outlet) => outlet._id !== record._id);
    setSelectedOutlets(updatedSelectedOutlets);
  };

  const handleSelectAll = (selected, selectedRows) => {
    setSelectedOutlets(selected ? selectedRows : []);
  };

  const handleNext = () => {
    const selectedItems = selectedOutlets.map((outlet) => ({
      outlet_name: outlet.outlet_name,
      foodHandlers: outlet.no_of_food_handlers,
      manDays: outlet.man_days,
      unitCost: outlet.unit_cost,
      discount: 0,
      amount: outlet.amount,
    }));
    setItems(selectedItems);
    setShowForm(true);
  };

 const handleSubmit = async () => {
   try {
     await form.validateFields();

     // Collect form values
     const formData = form.getFieldsValue();

     const invoiceData = {
       ...formData,
       proposalId,
       outlets: items,
       invoice_number: invoiceId,
     };

     console.log("Invoice Data to Submit:", invoiceData); // Debugging log

     await axios.post("/api/invoice/createInvoice", invoiceData);
     message.success("Invoice generated successfully");
     onCancel(); // Close the GenerateProposalModal
     setShowSendMailModal(true); // Show the GenerateSendMail modal
   } catch (error) {
     console.error("Error saving invoice:", error);
     message.error("Error generating invoice");
   }
 };



  const handleInputChange = (index, field, value) => {
    const newItems = [...items];
    if (field === "outlet_name") {
      const selectedOutlet = outlets.find(
        (outlet) => outlet.outlet_name === value
      );
      newItems[index] = {
        ...newItems[index],
        outlet_name: value,
        foodHandlers: selectedOutlet ? selectedOutlet.no_of_food_handlers : 0,
        manDays: selectedOutlet ? selectedOutlet.man_days : 0,
        unitCost: selectedOutlet ? selectedOutlet.unit_cost : 0,
      };
    } else {
      newItems[index][field] = value;
    }
    if (field !== "amount") {
      newItems[index].amount =
        newItems[index].foodHandlers *
          newItems[index].manDays *
          newItems[index].unitCost -
        newItems[index].discount;
    }
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subTotal * 0.09;
    const total = subTotal + 2 * tax;
    return { subTotal, tax, total };
  };

  const { subTotal, tax, total } = calculateTotals();

  const outletsColumns = [
    {
      title: "Outlet Name",
      dataIndex: "outlet_name",
      key: "outlet_name",
    },
    {
      title: "No of Food Handlers",
      dataIndex: "no_of_food_handlers",
      key: "no_of_food_handlers",
    },
    {
      title: "Man Days",
      dataIndex: "man_days",
      key: "man_days",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) =>
        amount.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
    },
  ];

 const itemsColumns = [
   {
     title: "Outlet name",
     dataIndex: "outlet_name",
     key: "outlet_name",
     render: (value) => <span className="text-center block">{value}</span>,
   },
   {
     title: "No of Food Handlers",
     dataIndex: "foodHandlers",
     key: "foodHandlers",
     render: (value) => <span className="text-center block">{value}</span>,
   },
   {
     title: "Man Days",
     dataIndex: "manDays",
     key: "manDays",
     render: (value) => <span className="text-center block">{value}</span>,
   },
   {
     title: "Unit Cost",
     dataIndex: "unitCost",
     key: "unitCost",
     render: (value) => <span className="text-center block">{value}</span>,
   },
   {
     title: "Discount",
     dataIndex: "discount",
     key: "discount",
     render: (value) => <span className="text-center block">{value}</span>,
   },
   {
     title: "Amount",
     dataIndex: "amount",
     key: "amount",
     render: (amount) => (
       <span className="text-center block">
         {amount.toLocaleString("en-IN", {
           style: "currency",
           currency: "INR",
         })}
       </span>
     ),
   },
 ];


  return (
    <>
      <Modal
        visible={visible}
        onCancel={handleCancel}
        footer={null}
        width={900}
        className="acc-modal"
      >
        <Form layout="vertical" onFinish={handleSubmit} form={form}>
          <div
            className="text-center align-middle font-medium text-xl bg-blue-50 p-7"
            style={{ boxShadow: "0 4px 2px -2px lightgrey" }}
          >
            Generate Invoice
          </div>
          {!showForm ? (
            <div className="p-4" style={{ backgroundColor: "#F6FAFB" }}>
              <div className="text-center font-medium text-xl mb-5 rounded-md">
                Select Outlets
              </div>
              <Table
                dataSource={outlets}
                columns={outletsColumns}
                pagination={false}
                rowKey={(record) => record._id}
                rowSelection={{
                  selectedRowKeys: selectedOutlets.map((outlet) => outlet._id),
                  onSelect: handleSelect,
                  onSelectAll: handleSelectAll,
                }}
                rowClassName={(record) =>
                  record.is_invoiced ? "disabled-row" : ""
                }
              />
              <div className="text-center mt-4">
                <Button
                  className="bg-buttonModalColor px-4 py-2 text-white rounded"
                  onClick={handleNext}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6" style={{ backgroundColor: "#F6FAFB" }}>
              <div className="text-center font-medium text-xl mb-5 rounded-md">
                Invoice Details
              </div>
              <Form.Item
                label="FBO name (Business Name)"
                name="fbo_name"
                className="flex-1"
              >
                <Input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </Form.Item>
              <div className="flex space-x-4">
                <Form.Item
                  label="Invoice date"
                  className="flex-1"
                  size="large"
                  name="invoice_date"
                >
                  <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item
                  label="Proposal number (Order Ref No.)"
                  className="flex-1"
                  name="proposal_number"
                >
                  <Input
                    placeholder="Auto Generated"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
                <Form.Item label="Invoice number" className="flex-1">
                  <Input
                    value={invoiceId}
                    placeholder="Auto Generated"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
              </div>
              <Form.Item label="Address">
                <Input.Group>
                  <Form.Item name={["address", "line1"]}>
                    <Input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </Form.Item>
                  <Form.Item name={["address", "line2"]}>
                    <Input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              <div className="flex space-x-4">
                <Form.Item label="Pincode" name="pincode" className="flex-1">
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
                <Form.Item
                  label="Place Of Supply"
                  name="place_of_supply"
                  className="flex-1"
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
              </div>
              <div className="flex space-x-4">
                <Form.Item
                  label="Field Executive Name"
                  name="field_executive_name"
                  className="flex-1"
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
                <Form.Item
                  label="Team Leader Name"
                  name="team_leader_name"
                  className="flex-1"
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
              </div>
              <div className="my-4">
                <h3 className="text-lg font-semibold mb-2">Items Table</h3>
                <Table
                  dataSource={items}
                  columns={itemsColumns}
                  pagination={false}
                  rowKey={(item) => item.outlet_name}
                  rowClassName="text-left"
                />
              </div>
              <div className="my-4 p-4 border rounded w-1/2 ml-auto bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Sub Total:</div>
                  <div className="text-sm font-medium">
                    {subTotal.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">CGST [9%]:</div>
                  <div className="text-sm font-medium">
                    {(tax / 2).toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">SGST [9%]:</div>
                  <div className="text-sm font-medium">
                    {(tax / 2).toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">Total:</div>
                  <div className="text-lg font-bold">
                    {total.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>
              </div>
              <div className="text-center mt-4">
                <Button
                  className="bg-buttonModalColor px-4 py-2 text-white rounded"
                  htmlType="submit"
                >
                  Generate
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {showSendMailModal && (
        <GenerateSendMail
          onClose={() => setShowSendMailModal(false)}
          title="Generate Invoice"
          inputPlaceholder="Greeting from unavar"
          successMessage="Your custom success message"
        />
      )}
    </>
  );
};

export default GenerateInvoiceModal;