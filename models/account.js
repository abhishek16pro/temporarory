import mongoose from "mongoose";

const accountCred = new mongoose.Schema({
	type: {
		type: String,
		required: true,
		default: "client",
		enum: ["client", "dealer", "individual"],
	},
	firstName: {
		type: String,
		require: true,
		max: 30,
		min: 4,
	},
	lastName: {
		type: String,
		max: 30,
		min: 2
	},
	brokerName: {
		type: String,
		require: true,
		max: 50
	},
	brokerUrl: {
		type: String,
		require: false,
	},
	userId: {
		type: String,
		require: true,
		unique: true,
		max: 50
	},
	loginId: {
		type: String,
		require: true,
		max: 50
	},
	password: {
		type: String,
		require: true,
		max: 50
	},
	appKey: {
		type: String,
		require: true,
		max: 50
	},
	secretKey: {
		type: String,
		require: true,
		max: 50
	},
	multiplier: {
		type: Number,
		default: 1,
		max: 30
	},
	marginAvailable: {
		type: Number,
		default: -1,
	},
	marginUtilized: {
		type: Number,
		default: -1,	
	},
	margin: {
		type: Number,
		default: -1,
	},
	maxLoss: {
		type: Number,
		default: 1,
		min: 0,
		max: 2
	},
	maxProfit: {
		type: Number,
		default: 1,
		min: 0,
		max: 2
	},
	mapped: {
		type: Boolean,
		require: true,
		default: true
	},
	login: {
		type: Boolean,
		require: true,
		default: false
	},
	active: {
		type: Boolean,
		require: true,
		default: false
	},
	cred: {
		type: Boolean,
		require: true,
		default: false
	},
	parent: {
		type: Boolean,
		require: true,
		default: false
	},
	isDealer: {
		type: Boolean,
		require: true,
		default: false
	},
	isIndividualClient: {
		type: Boolean,
		required: true,
		default: false
	}
},
	{
		strict: false,
		timestamps: true
	}
)

mongoose.pluralize(null);
const account = mongoose.model("cred", accountCred);
export default account;