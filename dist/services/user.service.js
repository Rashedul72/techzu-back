"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserInTransaction = ensureUserInTransaction;
const httpError_1 = require("../lib/httpError");
async function ensureUserInTransaction(tx, rawUsername) {
    const username = rawUsername.trim().slice(0, 64);
    if (!username)
        throw new httpError_1.HttpError(400, "Invalid username");
    return tx.user.upsert({
        where: { username },
        create: { username },
        update: {},
    });
}
