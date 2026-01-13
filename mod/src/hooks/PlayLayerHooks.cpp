#include <Geode/Geode.hpp>
#include <Geode/modify/PlayLayer.hpp>
#include <Geode/modify/EndLevelLayer.hpp>
#include "../YukiManager.hpp"
#include <chrono>

using namespace geode::prelude;

class $modify(YukiPlayLayer, PlayLayer) {
    struct Fields {
        int attempts = 0;
        int bestPercentage = 0;
        int currentPercentage = 0;
        bool levelCompleted = false;
        std::vector<bool> coinsCollected;
        std::chrono::steady_clock::time_point lastSubmitTime;
        bool hasSubmittedThisSession = false;
    };

    static constexpr int MIN_PERCENTAGE_TO_SUBMIT = 5;
    static constexpr int MIN_SECONDS_BETWEEN_SUBMITS = 5;

    bool init(GJGameLevel* level, bool useReplay, bool dontCreateObjects) {
        if (!PlayLayer::init(level, useReplay, dontCreateObjects)) {
            return false;
        }

        m_fields->attempts = 0;
        m_fields->bestPercentage = 0;
        m_fields->currentPercentage = 0;
        m_fields->levelCompleted = false;
        m_fields->coinsCollected.clear();
        m_fields->hasSubmittedThisSession = false;
        m_fields->lastSubmitTime = std::chrono::steady_clock::now() - std::chrono::seconds(MIN_SECONDS_BETWEEN_SUBMITS);

        // Initialize coins array based on level's coin count
        int coinCount = level->m_coins;
        for (int i = 0; i < coinCount; i++) {
            m_fields->coinsCollected.push_back(false);
        }

        return true;
    }

    void updateProgressbar() {
        PlayLayer::updateProgressbar();
        
        // Track current percentage
        m_fields->currentPercentage = getCurrentPercentInt();
        if (m_fields->currentPercentage > m_fields->bestPercentage) {
            m_fields->bestPercentage = m_fields->currentPercentage;
        }
    }

    void resetLevel() {
        // Capture percentage before reset
        int deathPercentage = m_fields->currentPercentage;
        
        PlayLayer::resetLevel();

        if (!m_fields->levelCompleted) {
            m_fields->attempts++;
            
            // Submit death if criteria met
            if (shouldSubmitDeath(deathPercentage)) {
                submitDeath(deathPercentage);
            }
        }
        
        // Reset current percentage for new attempt
        m_fields->currentPercentage = 0;
    }

    bool shouldSubmitDeath(int percentage) {
        // Never submit in practice mode
        if (m_isPracticeMode) return false;
        
        if (!Mod::get()->getSettingValue<bool>("auto-submit")) return false;
        if (!Mod::get()->getSettingValue<bool>("submit-fails")) return false;
        if (!YukiManager::get()->isLinked()) return false;
        
        // Must be at least MIN_PERCENTAGE_TO_SUBMIT%
        if (percentage < MIN_PERCENTAGE_TO_SUBMIT) return false;
        
        // Rate limit: MIN_SECONDS_BETWEEN_SUBMITS seconds since last submit
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            now - m_fields->lastSubmitTime
        ).count();
        
        if (elapsed < MIN_SECONDS_BETWEEN_SUBMITS) return false;
        
        return true;
    }

    void submitDeath(int percentage) {
        if (!m_level) return;
        
        m_fields->lastSubmitTime = std::chrono::steady_clock::now();
        m_fields->hasSubmittedThisSession = true;

        ScoreData score;
        score.levelId = m_level->m_levelID.value();
        score.levelName = m_level->m_levelName;
        score.levelCreator = m_level->m_creatorName;
        score.percentage = percentage;
        score.attempts = m_fields->attempts;
        score.passed = false;
        score.isPractice = false; // Deaths are never sent in practice mode anyway
        score.coinsCollected = m_fields->coinsCollected;

        YukiManager::get()->submitScore(score);
        
        log::debug("Submitted death at {}%", percentage);
    }

    void levelComplete() {
        m_fields->levelCompleted = true;
        m_fields->bestPercentage = 100;

        // Collect coin status
        if (m_level) {
            m_fields->coinsCollected.clear();
            // In GD, coins collected are stored differently
            // For now we track if they got all coins
            int coinsGot = m_level->m_coinsVerified;
            int totalCoins = m_level->m_coins;
            for (int i = 0; i < totalCoins; i++) {
                m_fields->coinsCollected.push_back(i < coinsGot);
            }
        }

        PlayLayer::levelComplete();
    }

    void onQuit() {
        PlayLayer::onQuit();
    }

    void submitScore(bool passed) {
        // Practice mode: only allow passes, not fails
        if (m_isPracticeMode && !passed) return;
        
        if (!YukiManager::get()->isLinked()) return;
        if (!Mod::get()->getSettingValue<bool>("auto-submit")) return;
        if (!m_level) return;

        m_fields->lastSubmitTime = std::chrono::steady_clock::now();

        ScoreData score;
        score.levelId = m_level->m_levelID.value();
        score.levelName = m_level->m_levelName;
        score.levelCreator = m_level->m_creatorName;
        score.percentage = passed ? 100 : m_fields->bestPercentage;
        score.attempts = m_fields->attempts;
        score.passed = passed;
        score.isPractice = m_isPracticeMode;
        score.coinsCollected = m_fields->coinsCollected;

        YukiManager::get()->submitScore(score);
    }
};

class $modify(YukiEndLevelLayer, EndLevelLayer) {
    void customSetup() {
        EndLevelLayer::customSetup();

        // Submit the passing score when EndLevelLayer appears
        auto playLayer = PlayLayer::get();
        if (playLayer) {
            auto yukiLayer = static_cast<YukiPlayLayer*>(playLayer);
            yukiLayer->submitScore(true);
        }
    }
};
