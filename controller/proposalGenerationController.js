import puppeteer from "puppeteer";
import { promises as fs } from "fs";
import path from "path";
import nodemailer from "nodemailer";
import Proposal from "../models/proposalModel.js";

const __dirname = path.resolve();

export const generateProposal = async (req, res) => {
  try {
    const { proposalId } = req.params; // Access proposalId from route parameters
    const { to, message } = req.body; // Email details


    console.log("hello",process.env.EMAIL_PASSWORD);

    // Fetch proposal details based on proposalId
    const proposalDetails = await Proposal.findById(proposalId).exec();

    if (!proposalDetails) {
      return res.status(404).send("Proposal not found");
    }

    const {
      fbo_name,
      contact_person,
      phone,
      address: { line1, line2 },
      gst_number,
      outlets,
      proposal_number,
      proposal_date,
      pincode
    } = proposalDetails;

    // Calculate total, cgst, sgst, and total
    let total = 0;
    outlets.forEach((outlet) => {
      total += parseFloat(outlet.amount.$numberInt || outlet.amount);
    });

    const cgst = parseFloat((total * 0.09).toFixed(2)); // 9% CGST
    const sgst = parseFloat((total * 0.09).toFixed(2)); // 9% SGST
    const overallTotal = parseFloat((total + cgst + sgst).toFixed(2));


    // Convert MongoDB date format
    const proposalDate = proposal_date?.$date?.$numberLong
      ? new Date(parseInt(proposal_date.$date.$numberLong))
      : new Date(); // Fallback to current date if undefined

    // Read HTML template from file
    const htmlTemplate = await fs.readFile(
      path.join(__dirname, "templates", "proposal.html"),
      "utf-8"
    );

    // Read the image file and convert it to base64 encoding
    const imagePath = path.join(__dirname, "templates", "logo2.png");
    const imageData = await fs.readFile(imagePath, { encoding: "base64" });



    // Generate the outlet content dynamically
    const outletRows = outlets
    .map((outlet) => {
      let postfix = "";
      switch (outlet.type_of_industry) {
        case "Transportation":
          postfix = "VH";
          break;
        case "Catering":
          postfix = "FH";
          break;
        case "Trade and Retail":
          postfix = "Sq ft";
          break;
        case "Manufacturing":
          postfix = "PD/Line";
          break;
        default:
          postfix = ""; // or any default value
      }
  
      const outletName = outlet.outlet_name || "";
      const description = outlet.description || "";
      const service = outlet.unit ? `${outlet.unit} ${postfix}` : "";
      const manDays = outlet.man_days?.$numberDouble || outlet.man_days || 0;
      const quantity = outlet.quantity?.$numberInt || outlet.quantity || 0;
      const unitCost = outlet.unit_cost?.$numberInt || outlet.unit_cost || 0;
      const amount = outlet.amount?.$numberInt || outlet.amount || 0;
  
      return `
        <tr>
          <td class="px-2 py-1 text-center">${outletName}</td>
          <td class="px-2 py-1 text-center">${description}</td>
          <td class="px-2 py-1 text-center">${service}</td>
          <td class="px-2 py-1 text-center">${manDays}</td>
          <td class="px-2 py-1 text-center">${quantity}</td>
          <td class="px-2 py-1 text-center">${unitCost}</td>
          <td class="px-2 py-1 text-center">${amount}</td>
        </tr>
      `;
    })
    .join("");
  

    // Inject dynamic data into HTML template
    const dynamicContent = htmlTemplate
      .replace(/{{fbo_name}}/g, fbo_name)
      .replace(/{{contact_person}}/g, contact_person)
      .replace(/{{contactPersonNumber}}/g, phone)
      .replace(/{{address}}/g, `${line1}, ${line2}`)
      .replace(/{{gst_number}}/g, gst_number)
      .replace(/{{proposalNumber}}/g, proposal_number)
      .replace(/{{proposalDate}}/g, proposalDate.toLocaleDateString())
      .replace(/{{outletRows}}/g, outletRows)
      .replace(/{{imageData}}/g, imageData)
      .replace(/{{total}}/g, total)
      .replace(/{{cgst}}/g, cgst)
      .replace(/{{sgst}}/g, sgst)
      .replace(/{{pincode}}/g, pincode)
      .replace(/{{overallTotal}}/g, overallTotal);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the base URL to allow relative paths for resources like images
    const baseUrl = `file://${__dirname}/templates/`;
    await page.setContent(dynamicContent, {
      waitUntil: "networkidle0",
      baseUrl,
    });

    // Generate PDF content dynamically based on client input
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true }); // Generate PDF in A4 format
    await browser.close();


    console.log("arun")

    // Set up Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: "unavar.steamtroops@gmail.com",
        pass: "nwgg jdxf emoq enmo",
      },
    });

   

    const mailOptions = {
      from: "Arun",
      to, // Email recipient from request body
      subject: "Proposal Document",
      text: message, // Message body from request body
      attachments: [
        {
          filename: `proposal-${proposalId}.pdf`,
          content: pdfBuffer,
          encoding: "base64",
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);

    // Update proposal status to "Mail Sent"
    await Proposal.findByIdAndUpdate(proposalId, { status: "Mail Sent" });

    // Respond to client
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error generating PDF or sending email:", error);
    res.status(500).send("Internal Server Error");
  }
};
