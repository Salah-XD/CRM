import React, { useState, useEffect } from "react";
import {
  Modal,
  DatePicker,
  Form,
  InputNumber,
  Input,
  Select,
  Table,
  Button,
  Spin,
  message,
} from "antd";
import moment from "moment";
import axios from "axios";
import "../css/GenerateProposalModal.css";

const { Option } = Select;

const GenerateProposalModal = ({ visible, onOk, onCancel, enquiryId }) => {
  const [form] = Form.useForm();
  const [outletItem, setItems] = useState([
    {
      outletId: "",
      no_of_food_handlers: 0,
      man_days: 0,
      unit_cost: 0,
      discount: 0,
      amount: 0,
    },
  ]);
  const [proposal_date, setProposalDate] = useState(moment());
  const [proposal_number, setProposalNumber] = useState("");
  const [outlets, setOutlets] = useState([]);
  const [initialValuesLoaded, setInitialValuesLoaded] = useState(false);

  const handleCancel = () => {
    setItems([]);
    setItems([
      {
        outletId: "",
        outlet_name: "",
        no_of_food_handlers: 0,
        man_days: 0,
        unit_cost: 0,
        discount: 0,
        amount: 0,
      },
    ]); // Reset items to the initial value with one default item
    onCancel();
  };

  useEffect(() => {
    if (visible) {
      setProposalDate(moment());

      const fetchProposalNumber = async () => {
        try {
          const response = await axios.get(
            "/api/proposal/genrateProposalNumber"
          );
          setProposalNumber(response.data);
          form.setFieldsValue({ proposal_number: response.data.proposal_number }); // Ensure proposal_number is set in the form
        } catch (error) {
          console.error("Error in fetching proposal Number", error);
        }
      };

      const fetchOutlets = async () => {
        try {
          const response = await axios.get(
            `/api/proposal/getOutletDetailsById/${enquiryId}`
          );
          const outletData = response.data;
          setOutlets(outletData);

          // Set items state with fetched data
          setItems(
            outletData.map((outlet) => ({
              outletId: outlet._id || "",
              outlet_name: outlet.branch_name || "",
              no_of_food_handlers: outlet.no_of_food_handlers || 0,
              man_days: calculateManDays(outlet.no_of_food_handlers || 0),
              unit_cost: outlet.unit_cost || 0,
              discount: 0,
              amount:
                (outlet.no_of_food_handlers || 0) *
                calculateManDays(outlet.no_of_food_handlers || 0) *
                (outlet.unit_cost || 0),
            }))
          );
        } catch (error) {
          console.error("Error fetching outlets", error);
        }
      };

      const fetchBusinessDetails = async () => {
        try {
          const response = await axios.get(
            `/api/proposal/getBusinessDetailsByEnquiryId/${enquiryId}`
          );
          const businessData = response.data;

          const addressLine1 = businessData.address?.line1 || "";
          const addressLine2 = businessData.address?.line2 || "";

          // Concatenate addressLine1 with addressLine2 if either one exists
          const line1 = [addressLine1, addressLine2].filter(Boolean).join(", ");

          const city = businessData.address?.city || "";
          const state = businessData.address?.state || "";

          // Concatenate city and state if both exist
          const line2 = [city, state].filter(Boolean).join(", ");

          form.setFieldsValue({
            fbo_name: businessData.name,
            address: {
              line1: line1,
              line2: line2,
            },
            pincode: businessData.address?.pincode || "",
            gst_number: businessData.gst_number,
            contact_person: businessData.contact_person,
            phone: businessData.phone,
            email: businessData.email || "", // Handle email if available
          });
          setInitialValuesLoaded(true);
        } catch (error) {
          console.error("Error fetching business details", error);
        }
      };

      fetchOutlets();
      fetchProposalNumber();
      fetchBusinessDetails();
    }
  }, [visible, enquiryId, form]);

  const handleSubmit = async () => {
    try {
      // Validate form fields before submission
      await form.validateFields();

      // Collect form values
      const formData = form.getFieldsValue();

      // Prepare data to send
      const proposalData = {
        ...formData,
        proposal_date: proposal_date.format("YYYY-MM-DD"),
        outlets: outletItem,
      };

      // Make POST request to server
      const response = await axios.post(
        "/api/proposal/createProposalAndOutlet",
        proposalData
      );

      message.success("Proposal generated successfully!");
      onOk(); // Close the modal or perform any other action on success
    } catch (error) {
      message.error("Failed to generate proposal.");
    }
  };

  const addItem = () => {
    setItems([
      ...outletItem,
      {
        outletId: "",
        outlet_name: "",
        no_of_food_handlers: 0,
        man_days: 0,
        unit_cost: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (index) => {
    const newItems = outletItem.filter((item, i) => i !== index);
    setItems(newItems);
  };

  const calculateManDays = (foodHandlers) => {
    if (foodHandlers <= 50) return 0.5;
    if (foodHandlers <= 100) return 1;
    if (foodHandlers <= 300) return 1.5;
    if (foodHandlers <= 600) return 2.5;
    if (foodHandlers <= 1000) return 3;
    return 3;
  };

  const handleInputChange = (index, field, value) => {
    const newItems = [...outletItem];
    if (field === "outletId") {
      const selectedOutlet = outlets.find((outlet) => outlet._id === value);
      const man_days = calculateManDays(
        selectedOutlet ? selectedOutlet.no_of_food_handlers : 0
      );
      newItems[index] = {
        ...newItems[index],
        outletId: value,
        outlet_name: selectedOutlet ? selectedOutlet.branch_name : "", // Ensure outlet_name is set
        foodHandlers: selectedOutlet ? selectedOutlet.no_of_food_handlers : 0,
        man_days,
        unitCost: selectedOutlet ? selectedOutlet.unitCost : 0,
      };
    } else {
      newItems[index][field] = value;
      if (field === "foodHandlers") {
        newItems[index].man_days = calculateManDays(value);
      }
    }
    newItems[index].amount =
      newItems[index].foodHandlers *
        newItems[index].man_days *
        newItems[index].unitCost -
      newItems[index].discount;
    setItems(newItems);
  };

  const calculateTotals = () => {
    if (!Array.isArray(outletItem) || outletItem.length === 0) {
      return { subTotal: 0, igst: 0, cgst: 0, total: 0 };
    }

    const subTotal = outletItem.reduce((sum, outletItem) => {
      const amount =
        typeof outletItem.amount === "number" ? outletItem.amount : 0;
      return sum + amount;
    }, 0);

    const igst = subTotal * 0.09;
    const cgst = subTotal * 0.09;
    const total = subTotal + igst + cgst;

    return { subTotal, igst, cgst, total };
  };

  const { subTotal, igst, cgst, total } = calculateTotals();
  const columns = [
    {
      title: "Outlet name",
      dataIndex: "outletId",
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => handleInputChange(index, "outletId", value)}
          className="w-full"
          style={{ width: 120 }}
        >
          {outlets.map((outlet) => (
            <Option key={outlet._id} value={outlet._id}>
              {outlet.branch_name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "No of Food Handlers",
      dataIndex: "no_of_food_handlers",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) =>
            handleInputChange(index, "no_of_food_handlers", value)
          }
          className="w-full"
        />
      ),
    },
    {
      title: "Man Days",
      dataIndex: "man_days",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) => handleInputChange(index, "man_days", value)}
          className="w-full"
        />
      ),
    },
    {
      title: "Unit Cost(₹) ",
      dataIndex: "unit_cost",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) => handleInputChange(index, "unit_cost", value)}
          className="w-full"
        />
      ),
    },
    {
      title: "Discount(₹)",
      dataIndex: "discount",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) => handleInputChange(index, "discount", value)}
          className="w-full"
        />
      ),
    },
    {
      title: "Amount(₹)",
      dataIndex: "amount",
      render: (text) =>
        text.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (_, __, index) => (
        <Button onClick={() => removeItem(index)} type="link" danger>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Modal
      visible={visible}
      onOk={onOk}
      onCancel={handleCancel}
      footer={null}
      width={900}
      style={{ padding: "0 !important" }}
      className="acc-modal"
    >
      <Form layout="vertical" onFinish={handleSubmit} form={form}>
        <div
          className="text-center align-middle font-medium text-xl title-div bg-blue-50 p-7"
          style={{ boxShadow: "0 4px 2px -2px lightgrey" }}
        >
          Generate Proposal
        </div>
        <div className="px-8 pt-4 pb-8" style={{ backgroundColor: "#F6FAFB" }}>
          <div className="text-center font-medium text-xl mb-5 rounded-md">
            Document Preview
          </div>
          <div className="flex space-x-4">
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
            <Form.Item label="Proposal date" className="flex-1" size="large">
              <DatePicker
                className="w-full"
                value={proposal_date}
                onChange={(date) => setProposalDate(date)}
                disabled
              />
            </Form.Item>
            <Form.Item
              label="Proposal number"
              name="proposal_number"
              className="flex-1"
            >
              <Input
                disabled
                placeholder="Auto Generated"
                className="w-full p-2 border border-gray-300 rounded"
                readOnly
              />
            </Form.Item>
          </div>
          <Form.Item label="Address">
            <Input.Group>
              <Form.Item name={["address", "line1"]}>
                <Input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Line 1"
                />
              </Form.Item>
              <Form.Item name={["address", "line2"]}>
                <Input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Line 2"
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
            <Form.Item label="GST Number" name="gst_number" className="flex-1">
              <Input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </Form.Item>
          </div>
          <div className="flex space-x-4">
            <Form.Item
              label="Contact Person Name"
              name="contact_person"
              className="flex-1"
            >
              <Input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </Form.Item>
            <Form.Item
              label="Contact Person Number"
              name="phone"
              className="flex-1"
            >
              <Input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </Form.Item>
          </div>

          <div className="my-4">
            <h3 className="text-lg font-semibold mb-2">Items table</h3>
            <Table
              dataSource={outletItem}
              columns={columns}
              pagination={false}
            />
            <button
              onClick={addItem}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              + Add New Row
            </button>
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
              <div className="text-sm font-medium">IGST (9%):</div>
              <div className="text-sm font-medium">
                {igst.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">CGST (9%):</div>
              <div className="text-sm font-medium">
                {cgst.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Total:</div>
              <div className="text-sm font-medium">
                {total.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </div>
            </div>
          </div>
          <div className="text-center mt-4">
            <button
              className="bg-buttonModalColor px-4 py-2 text-white rounded"
              onClick={handleSubmit}
            >
              Generate
            </button>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default GenerateProposalModal;
