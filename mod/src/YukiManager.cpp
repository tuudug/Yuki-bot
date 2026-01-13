#include "YukiManager.hpp"
#include <Geode/loader/Mod.hpp>

YukiManager* YukiManager::s_instance = nullptr;

YukiManager* YukiManager::get() {
    if (!s_instance) {
        s_instance = new YukiManager();
    }
    return s_instance;
}

std::string YukiManager::getServerUrl() const {
    return "https://yuki.tuuli.moe";
}

bool YukiManager::isLinked() const {
    return !getAuthToken().empty();
}

std::string YukiManager::getAuthToken() const {
    return Mod::get()->getSavedValue<std::string>("auth-token", "");
}

std::string YukiManager::getLinkedDiscordUsername() const {
    return Mod::get()->getSavedValue<std::string>("discord-username", "");
}

void YukiManager::setAuthToken(const std::string& token) {
    Mod::get()->setSavedValue("auth-token", token);
}

void YukiManager::setLinkedDiscordUsername(const std::string& username) {
    Mod::get()->setSavedValue("discord-username", username);
}

void YukiManager::unlinkAccount() {
    Mod::get()->setSavedValue("auth-token", std::string(""));
    Mod::get()->setSavedValue("discord-username", std::string(""));
}

void YukiManager::submitScore(const ScoreData& score) {
    if (!isLinked()) {
        log::warn("Cannot submit score: account not linked");
        return;
    }

    auto am = GJAccountManager::sharedState();
    int gdAccountId = am->m_accountID;
    std::string gdUsername = am->m_username;

    matjson::Value body;
    body["auth_token"] = getAuthToken();
    body["gd_account_id"] = gdAccountId;
    body["gd_username"] = gdUsername;
    body["level_id"] = score.levelId;
    body["percentage"] = score.percentage;
    body["attempts"] = score.attempts;
    body["passed"] = score.passed;
    body["is_practice"] = score.isPractice;
    
    matjson::Value coins = matjson::Value::array();
    for (bool coin : score.coinsCollected) {
        coins.push(coin);
    }
    body["coins_collected"] = coins;

    auto req = web::WebRequest();
    req.header("Content-Type", "application/json");
    req.bodyJSON(body);

    std::string url = getServerUrl() + "/api/scores";

    m_submitListener.bind([](web::WebTask::Event* event) {
        if (auto res = event->getValue()) {
            if (res->ok()) {
                log::info("Score submitted successfully");
            } else {
                log::error("Failed to submit score: {}", res->string().unwrapOr("Unknown error"));
            }
        } else if (event->isCancelled()) {
            log::warn("Score submission cancelled");
        }
    });

    m_submitListener.setFilter(req.post(url));
}

void YukiManager::linkAccount(const std::string& code, int gdAccountId, const std::string& gdUsername,
                              std::function<void(bool, const std::string&)> callback) {
    matjson::Value body;
    body["code"] = code;
    body["gd_account_id"] = gdAccountId;
    body["gd_username"] = gdUsername;

    auto req = web::WebRequest();
    req.header("Content-Type", "application/json");
    req.bodyJSON(body);

    std::string url = getServerUrl() + "/api/link/verify";

    m_linkListener.bind([this, callback](web::WebTask::Event* event) {
        if (auto res = event->getValue()) {
            if (res->ok()) {
                auto json = res->json();
                if (json.isOk()) {
                    auto data = json.unwrap();
                    if (data["success"].asBool().unwrapOr(false)) {
                        std::string authToken = data["auth_token"].asString().unwrapOr("");
                        std::string discordUsername = data["discord_username"].asString().unwrapOr("");
                        
                        setAuthToken(authToken);
                        setLinkedDiscordUsername(discordUsername);
                        
                        callback(true, discordUsername);
                        return;
                    }
                }
                callback(false, res->json().unwrapOr(matjson::Value())["error"].asString().unwrapOr("Unknown error"));
            } else {
                auto errorMsg = res->json().unwrapOr(matjson::Value())["error"].asString().unwrapOr("Request failed");
                callback(false, errorMsg);
            }
        } else if (event->isCancelled()) {
            callback(false, "Request cancelled");
        }
    });

    m_linkListener.setFilter(req.post(url));
}
