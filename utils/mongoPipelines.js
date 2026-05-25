export const getTagDetailsWithStrategyCount = (tag) => [{
    $match: {
        tag: tag
    }
},
{
    $lookup: {
        from: "strategies",
        localField: "tag",
        foreignField: "tag",
        as: "strategies"
    }
},
{
    $project: {
        tag: 1,
        mappedAccount: 1,
        tagParentAccount: 1,
        tagMaxLoss: 1,
        tagMaxProfit: 1,
        maxLossWaitSeconds: 1,
        maxProfitWaitSeconds: 1,
        strategyCount: {
            $size: "$strategies"
        },
        strategies: {
            $map: {
                input: "$strategies",
                as: "strategy",
                in: {
                    _id: "$$strategy._id",
                    name: "$$strategy.name"
                }
            }
        }
    }
}
];

export const getAllTagsWithStrategyCounts = () => [{
    $lookup: {
        from: "strategies",
        localField: "tag",
        foreignField: "tag",
        as: "strategies"
    }
},
{
    $project: {
        tag: 1,
        mappedAccount: 1,
        tagParentAccount: 1,
        tagMaxLoss: 1,
        tagMaxProfit: 1,
        maxLossWaitSeconds: 1,
        maxProfitWaitSeconds: 1,
        strategyCount: {
            $size: "$strategies"
        }
    }
}
];

export const getStrategiesByTagMinimal = (tag) => [{
    $match: {
        tag: tag
    }
},
{
    $project: {
        _id: 1,
        name: 1,
        status: 1
    }
}
];

export const getRunningStrategiesByTag = (tag) => [{
    $match: {
        tag: tag,
        status: "Running"
    }
},
{
    $project: {
        _id: 1
    }
}
];

export const getAccountDetailsWithTagInfo = (clientId) => [{
    $match: {
        userId: clientId
    }
},
{
    $lookup: {
        from: "stgtags",
        localField: "userId",
        foreignField: "mappedAccount.clientId",
        as: "tags"
    }
},
{
    $project: {
        userId: 1,
        brokerUrl: 1,
        isDealer: 1,
        tags: {
            $map: {
                input: "$tags",
                as: "tag",
                in: {
                    tagName: "$$tag.tag",
                    multiplier: {
                        $arrayElemAt: [{
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$$tag.mappedAccount",
                                        as: "account",
                                        cond: {
                                            $eq: ["$$account.clientId", clientId]
                                        }
                                    }
                                },
                                as: "filtered",
                                in: "$$filtered.multiplier"
                            }
                        },
                            0
                        ]
                    }
                }
            }
        }
    }
}
];

export const getStrategyWithTagInfo = (strategyId) => [{
    $match: {
        _id: strategyId
    }
},
{
    $lookup: {
        from: "stgtags",
        localField: "tag",
        foreignField: "tag",
        as: "tagInfo"
    }
},
{
    $project: {
        name: 1,
        status: 1,
        tag: 1,
        mappedAccount: 1,
        parentAcc: 1,
        tagInfo: {
            $arrayElemAt: ["$tagInfo", 0]
        }
    }
}
];

export const getAllStrategiesWithTagInfo = () => [{
    $lookup: {
        from: "stgtags",
        localField: "tag",
        foreignField: "tag",
        as: "tagInfo"
    }
},
{
    $project: {
        name: 1,
        status: 1,
        tag: 1,
        mappedAccount: 1,
        parentAcc: 1,
        tagMaxLoss: {
            $arrayElemAt: ["$tagInfo.tagMaxLoss", 0]
        },
        tagMaxProfit: {
            $arrayElemAt: ["$tagInfo.tagMaxProfit", 0]
        }
    }
}
];

export const buildDynamicPipeline = (matchConditions, projections, lookups = []) => {
    const pipeline = [];

    if (matchConditions) {
        pipeline.push({
            $match: matchConditions
        });
    }

    if (lookups && lookups.length > 0) {
        lookups.forEach(lookup => {
            pipeline.push({
                $lookup: lookup
            });
        });
    }

    if (projections) {
        pipeline.push({
            $project: projections
        });
    }

    return pipeline;
};

export const getPagedResults = (matchConditions, page = 1, limit = 10, sort = {}) => [{
    $match: matchConditions
},
{
    $sort: sort
},
{
    $skip: (page - 1) * limit
},
{
    $limit: limit
}
];

export const getCollectionStats = (groupByField) => [{
    $group: {
        _id: `$${groupByField}`,
        count: { $sum: 1 },
        totalMtm: { $sum: "$mtm" },
        avgMtm: { $avg: "$mtm" },
        minMtm: { $min: "$mtm" },
        maxMtm: { $max: "$mtm" }
    }
},
{
    $sort: {
        totalMtm: -1
    }
}
];

export const getWinLossStats = (groupByField) => [{
    $group: {
        _id: `$${groupByField}`,
        totalDays: { $sum: 1 },
        winningDays: {
            $sum: { $cond: [{ $gt: ["$mtm", 0] }, 1, 0] }
        },
        losingDays: {
            $sum: { $cond: [{ $lt: ["$mtm", 0] }, 1, 0] }
        }
    }
},
{
    $project: {
        _id: 1,
        totalDays: 1,
        winningDays: 1,
        losingDays: 1,
        winRate: {
            $cond: [
                { $eq: ["$totalDays", 0] },
                0,
                { $multiply: [{ $divide: ["$winningDays", "$totalDays"] }, 100] }
            ]
        }
    }
},
{
    $sort: { winRate: -1 }
}
];

export const getDrawdownStats = (groupByField) => [
    { $sort: { "clientId.userId": 1, date: 1 } },
    {
        $group: {
            _id: `$${groupByField}`,
            records: {
                $push: { date: "$date", mtm: "$mtm" }
            }
        }
    }
];

export default {
    getTagDetailsWithStrategyCount,
    getAllTagsWithStrategyCounts,
    getStrategiesByTagMinimal,
    getRunningStrategiesByTag,
    getAccountDetailsWithTagInfo,
    getStrategyWithTagInfo,
    getAllStrategiesWithTagInfo,
    buildDynamicPipeline,
    getPagedResults,
    getCollectionStats,
    getWinLossStats,
    getDrawdownStats
};