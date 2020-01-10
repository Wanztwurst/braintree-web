'use strict';

var Bootstrap3ModalFramework = require('../../../../../src/three-d-secure/external/frameworks/bootstrap3-modal');
var analytics = require('../../../../../src/lib/analytics');
var fake = require('../../../../helpers/fake');
var wait = require('../../../../helpers/promise-helper').wait;
var assets = require('../../../../../src/lib/assets');

describe('Bootstrap3ModalFramework', function () {
  beforeEach(function () {
    var self = this;

    this.sandbox.stub(analytics, 'sendEvent');
    this.sandbox.stub(Bootstrap3ModalFramework.prototype, 'setupSongbird');

    this.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: 'encoded_auth_fingerprint',
      gatewayConfiguration: {
        assetsUrl: 'http://example.com/assets',
        threeDSecure: {
          cardinalAuthenticationJWT: 'jwt'
        }
      }
    };
    this.client = {
      request: this.sandbox.stub().resolves(),
      getConfiguration: function () { return self.configuration; }
    };
    this.fakeCardinal = {
      configure: this.sandbox.stub(),
      setup: this.sandbox.stub(),
      on: this.sandbox.stub(),
      trigger: this.sandbox.stub().resolves({Status: false}),
      'continue': this.sandbox.stub()
    };
  });

  describe('setupSongbird', function () {
    beforeEach(function () {
      var fakeCardinal = this.fakeCardinal;

      this.fakeCardinal.on.withArgs('payments.setupComplete').yieldsAsync({});

      this.tds = new Bootstrap3ModalFramework({
        client: this.client
      });
      Bootstrap3ModalFramework.prototype.setupSongbird.restore();

      this.sandbox.stub(assets, 'loadScript').callsFake(function () {
        global.Cardinal = fakeCardinal;

        // allow a slight delay so timing tests can run
        return wait(5);
      });
    });

    afterEach(function () {
      delete global.Cardinal;
    });

    it('configures Cardinal to use bootstrap3 framework', function () {
      var framework = new Bootstrap3ModalFramework({
        client: this.client
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWith({
          payment: {
            framework: 'bootstrap3'
          }
        });
      });
    });

    it('configures Cardinal to use verbose logging and the bootstrap3 framework', function () {
      var framework = new Bootstrap3ModalFramework({
        client: this.client,
        loggingEnabled: true
      });

      return framework.setupSongbird().then(function () {
        expect(global.Cardinal.configure).to.be.calledWith({
          payment: {
            framework: 'bootstrap3'
          },
          logging: {
            level: 'verbose'
          }
        });
      });
    });

    it('creates a bootstrap modal for v1 fallback', function () {
      var framework;

      assets.loadScript.rejects(new Error('failed'));

      framework = new Bootstrap3ModalFramework({
        client: this.client
      });

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);

        expect(modal.querySelector('.modal.fade.in')).to.exist;
        expect(modal.querySelector('.modal-content')).to.exist;
        expect(modal.querySelector('.modal-body iframe')).to.equal(iframe);
      });
    });

    it('closes the modal when close button is clicked', function () {
      var framework;

      assets.loadScript.rejects(new Error('failed'));

      framework = new Bootstrap3ModalFramework({
        client: this.client
      });

      this.sandbox.stub(framework, 'cancelVerifyCard');

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);
        var btn = modal.querySelector('[data-braintree-v1-fallback-close-button]');

        document.body.appendChild(modal);

        btn.click();

        expect(framework.cancelVerifyCard).to.be.calledOnce;
        expect(framework.cancelVerifyCard).to.be.calledWithMatch({
          code: 'THREEDS_CARDINAL_SDK_CANCELED'
        });
        expect(document.body.querySelector('.modal.fade.in')).to.not.exist;
      });
    });

    it('closes the modal when backdrop is clicked', function () {
      var framework;

      assets.loadScript.rejects(new Error('failed'));

      framework = new Bootstrap3ModalFramework({
        client: this.client
      });

      this.sandbox.stub(framework, 'cancelVerifyCard');

      return framework.setupSongbird().then(function () {
        var iframe = document.createElement('iframe');
        var modal = framework._createV1IframeModal(iframe);
        var backdrop = modal.querySelector('[data-braintree-v1-fallback-backdrop]');

        document.body.appendChild(modal);

        backdrop.click();

        expect(framework.cancelVerifyCard).to.be.calledOnce;
        expect(framework.cancelVerifyCard).to.be.calledWithMatch({
          code: 'THREEDS_CARDINAL_SDK_CANCELED'
        });
        expect(document.body.querySelector('.modal.fade.in')).to.not.exist;
      });
    });

    // TODO doesn't work in Karma, enable this when using Jest instead
    // it('pressing escape key closes the modal', function () {
    //   var framework;
    //
    //   assets.loadScript.rejects(new Error('failed'));
    //
    //   framework = new Bootstrap3ModalFramework({
    //     client: this.client
    //   });
    //
    //   this.sandbox.stub(framework, 'cancelVerifyCard');
    //
    //   return framework.setupSongbird().then(function () {
    //     var iframe = document.createElement('iframe');
    //     var modal = framework._createV1IframeModal(iframe);
    //
    //     document.body.appendChild(modal);
    //
    //     document.dispatchEvent(new KeyboardEvent('keyup', {
    //       key: 'Escape'
    //     }));
    //
    //     expect(framework.cancelVerifyCard).to.be.calledOnce;
    //     expect(framework.cancelVerifyCard).to.be.calledWithMatch({
    //       code: 'THREEDS_CARDINAL_SDK_CANCELED'
    //     });
    //     expect(document.body.querySelector('.modal.fade.in')).to.not.exist;
    //   });
    // });
  });
});
