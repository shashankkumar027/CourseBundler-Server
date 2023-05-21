import app from "./app.js";
import { connectDB } from "./config/database.js";
import cloudinary from "cloudinary";
import Razorpay from "razorpay";
import nodeCron from "node-cron";
import { Stats } from "./models/Stats.js";


cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

nodeCron.schedule("0 0 0 1 * *", async () => {
  try {
    await Stats.create({});
  } catch (error) {
    console.log(error);
  }
});

app.listen(process.env.PORT,async () => {
  
  await connectDB();

  console.log(
    `* 🎉 Server is running on url: http://localhost:${process.env.PORT}`
  );

  app.get("/", (req, res) => {
    res.send(
      `<body style="text-align: center; margin-top: 20vh; background-color: #2F4562;">
        <h2 style="color: deeppink; font-size: 3rem">Hello!</h2>
        <br />
        <h1 style="color: blueviolet; font-size: 3.5rem">I'm Shashank.</h1>
        <h3 style="color: springgreen; font-size: 2.9rem">
          Server Working Fine...
        </h3>
        <h4  style="font-size: 2rem; font-family: cursive;">
          click
          <a
            href="${process.env.FRONTEND_URL}"
            style="color: crimson; font-size: 2rem; text-decoration: none; font-family: cursive;"
            >here
            </a>
          to visit CourseBundler!
        </h4>
      </body>`
    );
  });
});
