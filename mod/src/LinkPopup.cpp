#include "LinkPopup.hpp"
#include "YukiManager.hpp"
#include <Geode/ui/TextInput.hpp>

bool LinkPopup::setup()
{
    this->setTitle("Discord Account");

    auto contentSize = m_mainLayer->getContentSize();
    float centerX = contentSize.width / 2;

    bool isLinked = YukiManager::get()->isLinked();
    std::string username = YukiManager::get()->getLinkedDiscordUsername();

    auto menu = CCMenu::create();
    menu->setPosition({0, 0});
    m_mainLayer->addChild(menu);

    if (isLinked)
    {
        // Linked state UI
        auto linkedLabel = CCLabelBMFont::create(
            ("Linked to: " + username).c_str(),
            "bigFont.fnt");
        linkedLabel->setPosition({centerX, contentSize.height - 80});
        linkedLabel->setScale(0.55f);
        linkedLabel->setColor(ccc3(100, 255, 100));
        m_mainLayer->addChild(linkedLabel);

        auto checkmark = CCSprite::createWithSpriteFrameName("GJ_completesIcon_001.png");
        checkmark->setPosition({centerX, contentSize.height - 130});
        m_mainLayer->addChild(checkmark);

        auto unlinkBtnSpr = ButtonSprite::create("Unlink Account", "goldFont.fnt", "GJ_button_05.png", 0.8f);
        auto unlinkBtn = CCMenuItemSpriteExtra::create(
            unlinkBtnSpr,
            this,
            menu_selector(LinkPopup::onUnlink));
        unlinkBtn->setPosition({centerX, contentSize.height - 195});
        menu->addChild(unlinkBtn);
    }
    else
    {
        // Unlinked state UI
        auto instructions = CCLabelBMFont::create(
            "1. Click 'Open Browser' to get your code\n"
            "2. Authorize with Discord\n"
            "3. Enter the 6-character code below",
            "chatFont.fnt");
        instructions->setScale(0.65f);
        instructions->setPosition({centerX, contentSize.height - 60});
        instructions->setAlignment(CCTextAlignment::kCCTextAlignmentCenter);
        m_mainLayer->addChild(instructions);

        auto browserBtnSpr = ButtonSprite::create("Open Browser", "goldFont.fnt", "GJ_button_01.png", 0.8f);
        auto browserBtn = CCMenuItemSpriteExtra::create(
            browserBtnSpr,
            this,
            menu_selector(LinkPopup::onOpenBrowser));
        browserBtn->setPosition({centerX, contentSize.height - 110});
        menu->addChild(browserBtn);

        m_codeInput = TextInput::create(150.f, "Enter Code", "bigFont.fnt");
        m_codeInput->setPosition({centerX, contentSize.height - 150});
        m_codeInput->setMaxCharCount(6);
        m_codeInput->setFilter("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-");
        m_mainLayer->addChild(m_codeInput);

        auto linkBtnSpr = ButtonSprite::create("Link Account", "bigFont.fnt", "GJ_button_02.png", 0.6f);
        m_linkButton = CCMenuItemSpriteExtra::create(
            linkBtnSpr,
            this,
            menu_selector(LinkPopup::onLink));
        m_linkButton->setPosition({centerX, contentSize.height - 195});
        menu->addChild(m_linkButton);

        m_loadingCircle = LoadingCircle::create();
        m_loadingCircle->setPosition({centerX, contentSize.height - 195});
        m_loadingCircle->setScale(0.6f);
        m_loadingCircle->setVisible(false);
        m_mainLayer->addChild(m_loadingCircle);
    }

    m_statusLabel = CCLabelBMFont::create("", "chatFont.fnt");
    m_statusLabel->setScale(0.6f);
    m_statusLabel->setPosition({centerX, contentSize.height - 230});
    m_statusLabel->setVisible(false);
    m_mainLayer->addChild(m_statusLabel);

    return true;
}

void LinkPopup::onUnlink(CCObject *sender)
{
    createQuickPopup(
        "Unlink Account",
        "Are you sure you want to <cr>unlink</c> your Discord account?",
        "Cancel", "Unlink",
        [this](auto, bool btn2)
        {
            if (btn2)
            {
                YukiManager::get()->unlinkAccount();
                this->onClose(nullptr);
                FLAlertLayer::create("Unlinked", "Your Discord account has been unlinked.", "OK")->show();
            }
        });
}

void LinkPopup::onOpenBrowser(CCObject *sender)
{
    std::string url = YukiManager::get()->getServerUrl() + "/link";
    web::openLinkInBrowser(url);
}

void LinkPopup::onLink(CCObject *sender)
{
    std::string code = m_codeInput->getString();

    if (code.empty())
    {
        showStatus("Please enter a code", true);
        return;
    }

    if (code.length() != 6)
    {
        showStatus("Code must be 6 characters", true);
        return;
    }

    auto am = GJAccountManager::sharedState();
    int gdAccountId = am->m_accountID;
    std::string gdUsername = am->m_username;

    if (gdAccountId == 0)
    {
        showStatus("Please log into your GD account first", true);
        return;
    }

    setLoading(true);
    showStatus("Linking...", false);

    YukiManager::get()->linkAccount(code, gdAccountId, gdUsername,
                                    [this](bool success, const std::string &message)
                                    {
                                        setLoading(false);

                                        if (success)
                                        {
                                            showStatus("Linked to " + message + "!", false);

                                            // Close popup after delay
                                            this->runAction(CCSequence::create(
                                                CCDelayTime::create(1.5f),
                                                CCCallFunc::create(this, callfunc_selector(LinkPopup::closePopup)),
                                                nullptr));
                                        }
                                        else
                                        {
                                            showStatus(message, true);
                                        }
                                    });
}

void LinkPopup::setLoading(bool loading)
{
    m_linkButton->setVisible(!loading);
    m_loadingCircle->setVisible(loading);
    if (loading)
    {
        m_loadingCircle->show();
    }
    else
    {
        m_loadingCircle->fadeAndRemove();
        m_loadingCircle = LoadingCircle::create();
        m_loadingCircle->setPosition({m_mainLayer->getContentSize().width / 2, m_mainLayer->getContentSize().height - 195});
        m_loadingCircle->setScale(0.6f);
        m_loadingCircle->setVisible(false);
        m_mainLayer->addChild(m_loadingCircle);
    }
}

void LinkPopup::showStatus(const std::string &message, bool isError)
{
    m_statusLabel->setString(message.c_str());
    m_statusLabel->setColor(isError ? ccc3(255, 100, 100) : ccc3(100, 255, 100));
    m_statusLabel->setVisible(true);
}

void LinkPopup::closePopup()
{
    this->onClose(nullptr);
}

LinkPopup *LinkPopup::create()
{
    auto ret = new LinkPopup();
    if (ret && ret->initAnchored(300.f, 260.f))
    {
        ret->autorelease();
        return ret;
    }
    CC_SAFE_DELETE(ret);
    return nullptr;
}
