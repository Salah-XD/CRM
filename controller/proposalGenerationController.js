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
    } = proposalDetails;

    // Calculate total, cgst, sgst, and total
    let total = 0;
    outlets.forEach((outlet) => {
       total += parseFloat(outlet.amount.$numberInt || outlet.amount);
    });

    const cgst =  total * 0.09; // 9% CGST
    const sgst =  total * 0.09; // 9% SGST
    const overallTotal = total + cgst + sgst;

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
    const imagePath = path.join(__dirname, "templates", "logo.png");
    const imageData = await fs.readFile(imagePath, { encoding: "base64" });

    // Generate the outlet content dynamically
    const outletRows = outlets
      .map((outlet) => {
        const noOfFoodHandlers =
          outlet.no_of_food_handlers?.$numberInt ||
          outlet.no_of_food_handlers ||
          0;
        const manDays = outlet.man_days?.$numberDouble || outlet.man_days || 0;
        const unitCost = outlet.unit_cost?.$numberInt || outlet.unit_cost || 0;
        const discount = outlet.discount?.$numberInt || outlet.discount || 0;
        const amount = outlet.amount?.$numberInt || outlet.amount || 0;

        return `
      <tr>
        <td class="border">${outlet.outlet_name || ""}</td>
        <td class="border text-center">${noOfFoodHandlers}</td>
        <td class="border text-center">${manDays}</td>
        <td class="border text-center">${unitCost}</td>
        <td class="border text-center">${discount}</td>
        <td class="border">${amount}</td>
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

    // Set up Nodemailer
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
