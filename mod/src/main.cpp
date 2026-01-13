#include <Geode/Geode.hpp>
#include <Geode/modify/MenuLayer.hpp>
#include "YukiManager.hpp"
#include "LinkPopup.hpp"

using namespace geode::prelude;

class $modify(YukiMenuLayer, MenuLayer) {
    bool init() {
        if (!MenuLayer::init()) return false;

        if (auto rightMenu = this->getChildByID("right-side-menu")) {
            // Container for discord icon + status badge
            auto container = CCNode::create();
            
            auto discordIcon = CCSprite::createWithSpriteFrameName("gj_discordIcon_001.png");
            discordIcon->setPosition({discordIcon->getContentWidth() / 2, discordIcon->getContentHeight() / 2});
            container->addChild(discordIcon);
            container->setContentSize(discordIcon->getContentSize());
            
            // Add status badge in bottom-right corner
            bool isLinked = YukiManager::get()->isLinked();
            CCSprite* badge;
            if (isLinked) {
                badge = CCSprite::createWithSpriteFrameName("GJ_completesIcon_001.png");
            } else {
                badge = CCSprite::createWithSpriteFrameName("GJ_deleteIcon_001.png");
            }
            badge->setScale(0.4f);
            badge->setPosition({container->getContentWidth() - 2, 4});
            container->addChild(badge);
            
            auto btn = CCMenuItemSpriteExtra::create(
                container,
                this,
                menu_selector(YukiMenuLayer::onYukiButton)
            );
            btn->setID("yuki-button"_spr);
            
            rightMenu->addChild(btn);
            rightMenu->updateLayout();
        }

        return true;
    }

    void onYukiButton(CCObject*) {
        LinkPopup::create()->show();
    }
};

$on_mod(Loaded) {
    log::info("Yuki mod loaded!");
    
    if (YukiManager::get()->isLinked()) {
        log::info("Account linked to: {}", YukiManager::get()->getLinkedDiscordUsername());
    } else {
        log::info("Account not linked");
    }
}
