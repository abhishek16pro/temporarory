import mongoose from "mongoose";

const brokerListSchema = new mongoose.Schema(
      {
            brokerName: {
                  type: String,
                  required: true,
                  unique: true,
            },
            brokerUrl: {
                  type: String,
                  required: true,
                  unique: true,
            },
            mappedClient: {
                  type: [
                        {
                              clientId: {
                                    type: String,
                                    required: true,
                              },
                              isMapped: {
                                    type: Boolean,
                                    required: true,
                              },
                        },
                  ],
                  required: false,
            },
      },
      {
            timestamps: true,
            versionKey: "versionKey",
      },
);

const brokerList = mongoose.model("brokerList", brokerListSchema);
export default brokerList;
