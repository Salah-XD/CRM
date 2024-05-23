import Business from "../models/bussinessModel.js";
import Outlet from "../models/outletModel.js";
import PrivateCompany from "../models/privateModel.js";
import moment from "moment";
import nodemailer from "nodemailer";


// Controller function to handle saving client data
export const saveBusiness = async (req, res) => {

  console.log(req.body);
  try {
    const {
      form_id,
      name,
      contact_person,
      business_type,
      fssai_license_number,
      phone,
      email,
      gst_number,
      "address.line1": line1,
      "address.line2": line2,
      "address.city": city,
      "address.state": state,
      "address.pincode": pincode,
      added_by,
    } = req.body;

    if (
      !name ||
      !contact_person ||
      !business_type ||
      !phone ||
      !email ||
      !gst_number ||
      !line1 ||
      !line2 ||
      !city ||
      !state ||
      !pincode ||
      !added_by ||
      !fssai_license_number
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create a new business instance
    const newBusiness = new Business({
      form_id,
      name,
      contact_person,
      business_type,
      fssai_license_number,
      phone,
      email,
      gst_number,
      address: { line1, line2, city, state, pincode },
      added_by,
      status: "approved", // Set status to "approved" for a new form
      created_at: new Date(), // Record creation timestamp
    });

    // Save the new form to the database
    await newBusiness.save();

    return res.status(201).send({ success: true, data: newBusiness });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


//Controller function to handle update of client data 
export const updateBusiness = async (req, res) => {
  try {
    const {
      form_id,
      _id, // Assuming you have an _id field for the business object
      name,
      contact_person,
      business_type,
      fssai_license_number,
      phone,
      email,
      gst_number,
      "address.line1": line1,
      "address.line2": line2,
      "address.city": city,
      "address.state": state,
      "address.pincode": pincode,
      added_by,
    } = req.body;

    // Determine the search criteria (form_id or _id)
    let searchCriteria;
    if (form_id) {
      searchCriteria = { form_id };
    } else if (_id) {
      searchCriteria = { _id };
    } else {
      return res
        .status(400)
        .json({ message: "Either form_id or _id is required" });
    }

    // Find the existing business record by form_id or _id
    const existingBusiness = await Business.findOne(searchCriteria);

    if (!existingBusiness) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Update only the provided fields
    if (name) existingBusiness.name = name;
    if (contact_person) existingBusiness.contact_person = contact_person;
    if (business_type) existingBusiness.business_type = business_type;
    if (fssai_license_number)
      existingBusiness.fssai_license_number = fssai_license_number;
    if (phone) existingBusiness.phone = phone;
    if (email) existingBusiness.email = email;
    if (gst_number) existingBusiness.gst_number = gst_number;
    if (line1) existingBusiness.address.line1 = line1;
    if (line2) existingBusiness.address.line2 = line2;
    if (city) existingBusiness.address.city = city;
    if (state) existingBusiness.address.state = state;
    if (pincode) existingBusiness.address.pincode = pincode;
    if (added_by) existingBusiness.added_by = added_by;

    existingBusiness.updated_at = new Date(); // Record update timestamp

    // Save the updated business record to the database
    await existingBusiness.save();

    // Return the updated business record in the response
    return res.status(200).send({ success: true, data: existingBusiness });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


//Controller to check if the form id exist or not 
export const checkFormId = async (req, res) => {
  try {
    const { formId } = req.params;
    const existingBusiness = await Business.findOne({ form_id: formId });

    if (existingBusiness) {
      // Form ID exists in the Business Model
      res.status(200).json({ success: true, message: "Form ID exists" });
    } else {
      // Form ID does not exist in the Business Model
      res
        .status(404)
        .json({ success: false, message: "Form ID does not exist" });
    }
  } catch (error) {
    console.error("Error checking Form ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Controller to fetch business details by form ID or ID
export const getBusinessDetailsById = async (req, res) => {
  try {
    const { formId, id } = req.params;

    let business;
    if (formId) {
      // Fetch business details by form ID
      business = await Business.findOne({ form_id: formId });
    } else if (id) {
      // Fetch business details by ID
      business = await Business.findById(id);
    }

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.status(200).json({ success: true, data: business });
  } catch (error) {
    console.error('Error fetching business details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



//Save The outlet Information
export const saveOutlet = async (req, res) => {
  try {
    const {
      branch_name,
      business,
      name,
      gst_number,
      address,
      primary_contact_number,
      email,
      private_owned, // Corrected spelling
    } = req.body;

    // Check if branch_name and private_owned are provided and have valid values
    if (
      !branch_name ||
      !private_owned ||
      !["yes", "no"].includes(private_owned)
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Check if business ID is provided when the outlet is privately owned
    if (private_owned === "yes" && !business) {
      return res
        .status(400)
        .json({
          message: "Business ID is required when the outlet is privately owned",
        });
    }

    let newOutlet;

    // If the outlet is owned by a business
    if (private_owned === "no") {
      newOutlet = new Outlet({
        branch_name,
        business,
        private_company: null, // Corrected syntax
      });
    } else {
      // If the outlet is owned by a private company
      newOutlet = new Outlet({
        branch_name,
        business,
      });

      // Save private company data
      const privateCompanyData = {
        name,
        gst_number,
        address,
        primary_contact_number,
        email,
        business,
      };
      const newPrivateCompany = new PrivateCompany(privateCompanyData);
      await newPrivateCompany.save();

      // Associate the ObjectId of the private company with the outlet
      newOutlet.private_company = newPrivateCompany._id;
    }

    // Save the outlet
    await newOutlet.save();

    return res
      .status(201)
      .json({ message: "Outlet saved successfully", data: newOutlet });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


//Fetch Bussiness name to show in outlets
export const getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({}, "_id name");
    return res.status(200).json({ businesses });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Fetch bussiness detail to show in table

export const getAllBusinessDetails = async (req, res) => {
  try {
    const { page, pageSize, sort } = req.query;

    // Convert page and pageSize to integers
    const pageNumber = parseInt(page);
    const sizePerPage = parseInt(pageSize);

    // Validate page number and page size
    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(sizePerPage) ||
      sizePerPage < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid page or pageSize parameter" });
    }

    let query = Business.find({});

    // Apply sorting based on the 'sort' parameter
    if (sort === "newlyadded") {
      query = query.sort({ created_at: -1 });
    }

    // Count total number of businesses
    const totalBusinesses = await Business.countDocuments();

    // Retrieve businesses with pagination
    const businesses = await query
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .select(
        "-address -business_type -fssai_license_number -gst_number -updated_at"
      );

    // Retrieve outlet counts for each business
    const businessIds = businesses.map((business) => business._id);
    const outletCounts = await Outlet.aggregate([
      { $match: { business: { $in: businessIds } } },
      { $group: { _id: "$business", count: { $sum: 1 } } },
    ]);

    // Combine business data with outlet counts and format created_at field
    const businessesWithCountsAndFormattedDate = businesses.map((business) => {
      const outletCount = outletCounts.find((count) =>
        count._id.equals(business._id)
      );
      const formattedCreatedAt = moment(business.created_at).fromNow(); // Format created_at using Moment.js
      return {
        ...business.toObject(),
        outletCount: outletCount ? outletCount.count : 0,
        created_at: formattedCreatedAt, // Update created_at with formatted date
      };
    });

    res.json({
      totalPages: Math.ceil(totalBusinesses / sizePerPage),
      currentPage: pageNumber,
      businesses: businessesWithCountsAndFormattedDate,
    });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const countOutletsForBusinesses = async (req, res) => {
  try {
    // Aggregate outlets to count the number of outlets for each business
    const outletCountsByBusiness = await Outlet.aggregate([
      {
        $group: {
          _id: "$business", // Group by business ID
          count: { $sum: 1 }, // Count the number of outlets in each group
        },
      },
    ]);

    // Respond with the outlet counts for each business
    res.json(outletCountsByBusiness);
  } catch (error) {
    console.error("Error counting outlets for businesses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteFields = async (req, res) => {
  try {
    const arrayOfFieldIds = req.body; // Assuming an array of arrays of IDs is sent in the request body
    // Validate the arrayOfFieldIds here if necessary

    // Assuming Business is your Mongoose model
    const deletionPromises = arrayOfFieldIds.map((fieldIds) => {
      return Business.deleteMany({ _id: { $in: fieldIds } });
    });

    // Wait for all deletion operations to complete
    await Promise.all(deletionPromises);

    res.status(200).json({ message: "Fields deleted successfully" });
  } catch (err) {
    console.error("Error deleting fields:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Controller to send logic to
export const sendEmail = async (req, res) => {
  console.log(req.body);
  const { to, message, formLink } = req.body;

  try {
    if (!to || !message || !formLink) {
      throw new Error("Missing parameters");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    

    const mailOptions = {
      from: `<${process.env.EMAIL_USERNAME}>`,
      to,
      subject: "Client Onboarding Form",
      text: `${message}\n\nClient Onboarding Form: ${formLink}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

//Controlle to get Outelet Table
export const getOutletDetails = async (req, res) => {
  try {
    const outlets = await Outlet.find({})
      .populate("business")
      .populate("private_company");

    const populatedData = [];

    for (const outlet of outlets) {
      let data;

      if (outlet.private_company) {
        // If private_company is not null, extract data from Private model
        const privateCompany = outlet.private_company;
        data = {
          branch_name: outlet.branch_name,
          name: privateCompany.name,
          gst_number: privateCompany.gst_number,
          address: privateCompany.address,
          email: privateCompany.email,
          source: "PrivateCompany", // Indicate the source of data
        };
      } else if (outlet.business) {
        // If business is not null, extract data from Business model
        const business = outlet.business;
        data = {
          branch_name: outlet.branch_name,
          name: business.name,
          gst_number: business.gst_number,
          address: business.address,
          email: outlet.email,
          source: "Business", // Indicate the source of data
        };
      }

      // Add extracted data to the populatedData array
      if (data) populatedData.push(data);
    }

    return res
      .status(200)
      .json({ message: "Data populated successfully", data: populatedData });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
