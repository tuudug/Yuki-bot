#pragma once

#include <Geode/Geode.hpp>
#include <Geode/ui/Popup.hpp>

using namespace geode::prelude;

class LinkPopup : public geode::Popup<> {
protected:
    TextInput* m_codeInput = nullptr;
    CCLabelBMFont* m_statusLabel = nullptr;
    CCMenuItemSpriteExtra* m_linkButton = nullptr;
    LoadingCircle* m_loadingCircle = nullptr;

    bool setup() override;
    void onLink(CCObject* sender);
    void onUnlink(CCObject* sender);
    void onOpenBrowser(CCObject* sender);
    void setLoading(bool loading);
    void showStatus(const std::string& message, bool isError);

public:
    static LinkPopup* create();
};
