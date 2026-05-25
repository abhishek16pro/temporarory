import StrategySchema from "../models/strategy.js";
import StgTag from "../models/tag.js";
import Account from "../models/account.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import redisConnect from "../utils/redisConnect.js";
import fs from "fs";
// Import the new MongoDB pipelines
import {
    getTagDetailsWithStrategyCount,
    getAllTagsWithStrategyCounts,
    getStrategiesByTagMinimal,
    getRunningStrategiesByTag,
    buildDynamicPipeline
} from "../utils/mongoPipelines.js";
import { REDIS_MESSAGES } from "../../shared/constants/redisConstant.js";

const client = redisConnect();

const getAccountDetails = async (mappedAccount) => {
    const clientIds = mappedAccount.map(acc => acc.clientId);
    const accounts = await Account.find({ userId: { $in: clientIds } });

    const accountMap = {};
    accounts.forEach(account => {
        accountMap[account.userId] = account;
    });

    return mappedAccount.map(acc => {
        const account = accountMap[acc.clientId];
        return {
            ...acc,
            orderUrl: account?.brokerUrl || "",
            isDealer: account?.isDealer || false,
            active: acc.active !== undefined ? acc.active : true,
            multiplier: acc.multiplier || 1
        };
    });
};

export const addTag = async (req, res) => {
    try {
        const { tag, mappedAccount, tagParentAccount, tagMaxLoss, tagMaxProfit, maxLossWaitSeconds, maxProfitWaitSeconds } = req.body;

        if (!tag || !mappedAccount) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name and mapped accounts are required"
                }).toObject()
            );
        }

        if (tagMaxLoss !== undefined && (typeof tagMaxLoss !== 'number' || isNaN(tagMaxLoss) || tagMaxLoss < 0)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Max Loss must be a non-negative number"
                }).toObject()
            );
        }
        if (tagMaxProfit !== undefined && (typeof tagMaxProfit !== 'number' || isNaN(tagMaxProfit) || tagMaxProfit < 0)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Max Profit must be a non-negative number"
                }).toObject()
            );
        }

        const existingTag = await StgTag.findOne({ tag });
        if (existingTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag already exists"
                }).toObject()
            );
        }

        const accountDetails = await getAccountDetails(mappedAccount);
        const uppercaseTag = tag.toUpperCase();
        const newTag = new StgTag({
            tag: uppercaseTag,
            mappedAccount: accountDetails,
            tagParentAccount: tagParentAccount || "",
            tagMaxLoss: tagMaxLoss || 0,
            tagMaxProfit: tagMaxProfit || 0,
            maxLossWaitSeconds: maxLossWaitSeconds || 0,
            maxProfitWaitSeconds: maxProfitWaitSeconds || 0
        });

        await newTag.save();

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "Tag created successfully",
                data: newTag
            }).toObject()
        );
    } catch (error) {
        console.error("Error creating tag:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error creating tag",
                error: error.message
            }).toObject()
        );
    }
};

export const updateTag = async (req, res) => {
    try {
        const { tag, mappedAccount, tagParentAccount, tagMaxLoss, tagMaxProfit, maxLossWaitSeconds, maxProfitWaitSeconds } = req.body;

        if (!tag || !mappedAccount) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name and mapped accounts are required"
                }).toObject()
            );
        }

        if (tagMaxLoss !== undefined && (typeof tagMaxLoss !== 'number' || isNaN(tagMaxLoss) || tagMaxLoss < 0)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Max Loss must be a non-negative number"
                }).toObject()
            );
        }
        if (tagMaxProfit !== undefined && (typeof tagMaxProfit !== 'number' || isNaN(tagMaxProfit) || tagMaxProfit < 0)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Max Profit must be a non-negative number"
                }).toObject()
            );
        }

        const existingTag = await StgTag.findOne({ tag });
        if (!existingTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }

        const accountDetails = await getAccountDetails(mappedAccount);

        const updatedTag = await StgTag.findOneAndUpdate(
            { tag },
            {
                mappedAccount: accountDetails,
                tagParentAccount: tagParentAccount || existingTag.tagParentAccount,
                tagMaxLoss: tagMaxLoss !== undefined ? tagMaxLoss : existingTag.tagMaxLoss,
                tagMaxProfit: tagMaxProfit !== undefined ? tagMaxProfit : existingTag.tagMaxProfit,
                maxLossWaitSeconds: maxLossWaitSeconds !== undefined ? maxLossWaitSeconds : existingTag.maxLossWaitSeconds,
                maxProfitWaitSeconds: maxProfitWaitSeconds !== undefined ? maxProfitWaitSeconds : existingTag.maxProfitWaitSeconds
            },
            { new: true }
        );

        const strategiesUsingTag = await StrategySchema.find({ tag });

        if (strategiesUsingTag.length > 0) {
            const bulkOps = strategiesUsingTag.map(strategy => {
                const updateDoc = {
                    mappedAccount: accountDetails,
                };

                if (tagParentAccount) {
                    updateDoc.parentAcc = tagParentAccount;
                }

                return {
                    updateOne: {
                        filter: { _id: strategy._id },
                        update: { $set: updateDoc }
                    }
                };
            });

            await StrategySchema.bulkWrite(bulkOps);
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tag and associated strategies updated successfully",
                data: {
                    tag: updatedTag,
                    updatedStrategiesCount: strategiesUsingTag.length
                }
            }).toObject()
        );
    } catch (error) {
        console.error("Error updating tag:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error updating tag",
                error: error.message
            }).toObject()
        );
    }
};

export const removeTag = async (req, res) => {
    try {
        const { tag, strategyId } = req.body;

        if (!tag || !strategyId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name and strategy ID are required"
                }).toObject()
            );
        }

        const strategy = await StrategySchema.findById(strategyId);
        if (!strategy) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Strategy not found"
                }).toObject()
            );
        }

        if (strategy.tag !== tag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Strategy does not have the specified tag"
                }).toObject()
            );
        }

        strategy.tag = "";
        await strategy.save();

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tag removed from strategy successfully",
                data: strategy
            }).toObject()
        );
    } catch (error) {
        console.error("Error removing tag from strategy:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error removing tag from strategy",
                error: error.message
            }).toObject()
        );
    }
};

export const deleteTag = async (req, res) => {
    try {
        const { tag } = req.params;

        if (!tag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name is required"
                }).toObject()
            );
        }

        const existingTag = await StgTag.findOne({ tag });
        if (!existingTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }

        const strategiesUsingTag = await StrategySchema.find({ tag });
        if (strategiesUsingTag && strategiesUsingTag.length > 0) {
            const bulkOps = strategiesUsingTag.map(strategy => ({
                updateOne: {
                    filter: { _id: strategy._id },
                    update: {
                        $set: {
                            tag: "SIM",
                            mappedAccount: [
                                {
                                    active: true,
                                    clientId: "SIM",
                                    multiplier: 1,
                                    orderUrl: "",
                                    isDealer: false
                                }
                            ]
                        }
                    }
                }
            }));

            await StrategySchema.bulkWrite(bulkOps);
        }

        await StgTag.deleteOne({ tag });

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tag deleted successfully and removed from all strategies",
                data: {
                    removedFromStrategiesCount: strategiesUsingTag ? strategiesUsingTag.length : 0
                }
            }).toObject()
        );
    } catch (error) {
        console.error("Error deleting tag:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error deleting tag",
                error: error.message
            }).toObject()
        );
    }
};

export const getAllTags = async (req, res) => {
    try {
        const pipeline = getAllTagsWithStrategyCounts();
        const tags = await StgTag.aggregate(pipeline);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tags fetched successfully",
                data: tags
            }).toObject()
        );
    } catch (error) {
        console.error("Error fetching tags:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error fetching tags",
                error: error.message
            }).toObject()
        );
    }
};

export const getTagDetails = async (req, res) => {
    try {
        const { tag } = req.params;

        if (!tag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name is required"
                }).toObject()
            );
        }

        const pipeline = getTagDetailsWithStrategyCount(tag);
        const result = await StgTag.aggregate(pipeline);

        if (!result || result.length === 0) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tag details fetched successfully",
                data: result[0]
            }).toObject()
        );
    } catch (error) {
        console.error("Error fetching tag details:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error fetching tag details",
                error: error.message
            }).toObject()
        );
    }
};

export const setMultiplier = async (req, res) => {
    try {
        const { tag, multiplier, clientId } = req.body;

        if (!tag || multiplier === undefined) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag and multiplier are required"
                }).toObject()
            );
        }

        const existingTag = await StgTag.findOne({ tag });
        if (!existingTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }

        const strategiesUsingTag = await StrategySchema.find({ tag });

        if (clientId) {
            const clientIndex = existingTag.mappedAccount.findIndex(acc => acc.clientId === clientId);
            if (clientIndex === -1) {
                return res.send(
                    new ApiResponse({
                        success: false,
                        statusCode: 404,
                        message: "Client not found in this tag"
                    }).toObject()
                );
            }

            existingTag.mappedAccount[clientIndex].multiplier = parseFloat(multiplier);
            await existingTag.save();

            if (strategiesUsingTag.length > 0) {
                const bulkOps = strategiesUsingTag.map(strategy => {
                    const strategyClientIndex = strategy.mappedAccount.findIndex(acc => acc.clientId === clientId);
                    if (strategyClientIndex !== -1) {
                        const updatePath = `mappedAccount.${strategyClientIndex}.multiplier`;
                        return {
                            updateOne: {
                                filter: { _id: strategy._id },
                                update: { $set: { [updatePath]: parseFloat(multiplier) } }
                            }
                        };
                    }
                    return null;
                }).filter(op => op !== null);

                if (bulkOps.length > 0) {
                    await StrategySchema.bulkWrite(bulkOps);
                }
            }

            return res.send(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "Client multiplier updated successfully",
                    data: {
                        tag: existingTag,
                        updatedClient: existingTag.mappedAccount[clientIndex],
                        updatedStrategiesCount: strategiesUsingTag.length
                    }
                }).toObject()
            );
        }
        else {
            existingTag.mappedAccount = existingTag.mappedAccount.map(acc => ({
                ...acc,
                multiplier: parseFloat(multiplier)
            }));
            await existingTag.save();

            if (strategiesUsingTag.length > 0) {
                const bulkOps = strategiesUsingTag.map(strategy => ({
                    updateOne: {
                        filter: { _id: strategy._id },
                        update: {
                            $set: {
                                mappedAccount: strategy.mappedAccount.map(acc => ({
                                    ...acc,
                                    multiplier: parseFloat(multiplier)
                                }))
                            }
                        }
                    }
                }));

                await StrategySchema.bulkWrite(bulkOps);
            }

            return res.send(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "Tag multiplier updated successfully for all clients",
                    data: {
                        tag: existingTag,
                        updatedStrategiesCount: strategiesUsingTag.length
                    }
                }).toObject()
            );
        }
    } catch (error) {
        console.error("Error updating multiplier:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error updating multiplier",
                error: error.message
            }).toObject()
        );
    }
};

export const sqoffTagStrategy = async (req, res) => {
    const { tag } = req.query;

    if (!tag) {
        return res.status(400).send(
            new ApiResponse({
                success: false,
                statusCode: 400,
                message: "Tag is required"
            }).toObject()
        );
    }

    try {
        const tagExists = await StgTag.findOne({ tag });
        if (!tagExists) {
            return res.status(404).send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }

        // Use optimized pipeline for getting running strategies
        const pipeline = getRunningStrategiesByTag(tag);
        const strategies = await StrategySchema.aggregate(pipeline);

        if (strategies.length === 0) {
            return res.status(404).send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "No running strategies found for the provided tag"
                }).toObject()
            );
        }

        const pipelineRedis = client.pipeline();
        strategies.forEach(strategy => {
            const updateKey = `SQOFF:${strategy._id}`;
            // pipelineRedis.set(
            //     strategy._id.toString(),
            //     JSON.stringify({ msg: "sqoff" })
            // );
            pipelineRedis.set(
                updateKey,
                JSON.stringify({ message: REDIS_MESSAGES.STRATEGY_MANUAL_SQOFF })
            );
            pipelineRedis.expire(updateKey, 300);
        });
        await pipelineRedis.exec();

        return res.status(200).send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Strategies processed successfully",
                data: strategies.length
            }).toObject()
        );
    } catch (error) {
        console.error("Error processing strategies:", error);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Internal server error",
                error: error.message
            }).toObject()
        );
    }
};

export const copyTag = async (req, res) => {
    try {
        const { sourceTag, newTag } = req.body;
        if (!sourceTag || !newTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Source tag and new tag name are required"
                }).toObject()
            );
        }
        if (sourceTag === newTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "New tag name must be different from source tag"
                }).toObject()
            );
        }
        const existingSource = await StgTag.findOne({ tag: sourceTag });
        if (!existingSource) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Source tag not found"
                }).toObject()
            );
        }
        const existingNew = await StgTag.findOne({ tag: newTag });
        if (existingNew) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "New tag name already exists"
                }).toObject()
            );
        }
        const newTagObj = new StgTag({
            tag: newTag.toUpperCase(),
            mappedAccount: existingSource.mappedAccount.map(acc => ({ ...acc.toObject?.() || acc })),
            tagParentAccount: existingSource.tagParentAccount,
            tagMaxLoss: existingSource.tagMaxLoss,
            tagMaxProfit: existingSource.tagMaxProfit,
            maxLossWaitSeconds: existingSource.maxLossWaitSeconds,
            maxProfitWaitSeconds: existingSource.maxProfitWaitSeconds
        });
        await newTagObj.save();
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "Tag copied successfully",
                data: newTagObj
            }).toObject()
        );
    } catch (error) {
        console.error("Error copying tag:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error copying tag",
                error: error.message
            }).toObject()
        );
    }
}

export const resetTag = async (req, res) => {
    try {
        const { tag } = req.body;
        if (!tag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Tag name is required"
                }).toObject()
            );
        }
        const existingTag = await StgTag.findOne({ tag });
        if (!existingTag) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Tag not found"
                }).toObject()
            );
        }
        existingTag.mappedAccount = [];
        existingTag.tagParentAccount = "";
        existingTag.tagMaxLoss = 0;
        existingTag.tagMaxProfit = 0;
        existingTag.maxLossWaitSeconds = 0;
        existingTag.maxProfitWaitSeconds = 0;
        await existingTag.save();
        const keyPrefix = `tag:${tag}:`;
        const sqoffDoneKey = `${keyPrefix}sqoff_done`;
        const breachStatusKey = `${keyPrefix}breach_status`;
        const loggedWaitKey = `${keyPrefix}logged_wait`;
        await client.del(sqoffDoneKey);
        await client.del(breachStatusKey);
        await client.del(loggedWaitKey);
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tag reset successfully",
                data: existingTag
            }).toObject()
        );
    } catch (error) {
        console.error("Error resetting tag:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error resetting tag",
                error: error.message
            }).toObject()
        );
    }
};

export const importTags = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "No file uploaded"
                }).toObject()
            );
        }
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        let tagsInFile = [];
        try {
            tagsInFile = JSON.parse(fileContent);
        } catch (e) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Invalid JSON file"
                }).toObject()
            );
        }
        if (!Array.isArray(tagsInFile) || tagsInFile.length === 0) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "No tags found in file"
                }).toObject()
            );
        }
        return res.status(200).send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Tags loaded from file",
                data: tagsInFile
            }).toObject()
        );
    } catch (error) {
        console.error("Error loading tags from file:", error);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error loading tags from file",
                error: error.message
            }).toObject()
        );
    }
};

export const exportTags = async (req, res) => {
    try {
        const { tags } = req.body;
        if (!Array.isArray(tags) || tags.length === 0) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "No tags provided for export/import"
                }).toObject()
            );
        }
        const existingTags = await StgTag.find({ tag: { $in: tags.map(t => t.tag) } });
        const existingTagNames = new Set(existingTags.map(t => t.tag));
        const newTags = tags.filter(t => !existingTagNames.has(t.tag));
        if (!newTags.length) {
            return res.status(200).send(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "No new tags to insert (all exist)",
                    data: { inserted: 0, skipped: tags.length }
                }).toObject()
            );
        }

        const result = await StgTag.insertMany(newTags);
        return res.status(201).send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: `Inserted ${result.length} tags, skipped ${tags.length - result.length}`,
                data: { inserted: result.length, skipped: tags.length - result.length }
            }).toObject()
        );
    } catch (error) {
        console.error("Error inserting tags:", error);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error inserting tags",
                error: error.message
            }).toObject()
        );
    }
};