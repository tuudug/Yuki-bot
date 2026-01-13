#pragma once

#include <Geode/Geode.hpp>
#include <Geode/utils/web.hpp>
#include <string>

using namespace geode::prelude;

struct ScoreData {
    int levelId;
    std::string levelName;
    std::string levelCreator;
    int percentage;
    int attempts;
    bool passed;
    bool isPractice;
    std::vector<bool> coinsCollected;
};

class YukiManager {
public:
    static YukiManager* get();

    void submitScore(const ScoreData& score);
    void linkAccount(const std::string& code, int gdAccountId, const std::string& gdUsername,
                     std::function<void(bool, const std::string&)> callback);
    
    bool isLinked() const;
    std::string getAuthToken() const;
    std::string getLinkedDiscordUsername() const;
    void setAuthToken(const std::string& token);
    void setLinkedDiscordUsername(const std::string& username);
    void unlinkAccount();

    std::string getServerUrl() const;

private:
    YukiManager() = default;
    static YukiManager* s_instance;

    EventListener<web::WebTask> m_submitListener;
    EventListener<web::WebTask> m_linkListener;
};
