import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import unittest
from urllib.parse import urlparse
import server

class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload=payload; self.status=status
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def read(self): return json.dumps(self.payload).encode()

class CaptureOpener:
    def __init__(self, payload): self.payload=payload; self.calls=[]
    def __call__(self, req, timeout=0):
        self.calls.append((req,timeout))
        return FakeResponse(self.payload)

class PaymentServerTests(unittest.TestCase):
    def sumup_env(self):
        return {
            'DENTY_PAYMENT_PROVIDER':'sumup',
            'SUMUP_API_KEY':'sup_sk_test_secret',
            'SUMUP_MERCHANT_CODE':'MKTEST123',
            'SUMUP_AFFILIATE_KEY':'aff-key-123',
            'SUMUP_APP_ID':'com.denty.clinic',
        }

    def test_public_config_never_exposes_secrets(self):
        cfg=server.payment_config(self.sumup_env())
        self.assertTrue(cfg['enabled'])
        self.assertEqual(cfg['public']['provider'],'sumup')
        self.assertNotIn('api_key',cfg['public'])
        self.assertNotIn('affiliate_key',cfg['public'])
        self.assertEqual(cfg['public']['merchant_code_masked'],'MKT***123')

    def test_list_readers_calls_sumup_reader_endpoint_with_bearer(self):
        opener=CaptureOpener([{'id':'rdr_1','name':'Recepción','status':'paired','device':{'model':'solo'}}])
        out=server.payment_list_readers(opener=opener,environ=self.sumup_env())
        self.assertTrue(out['ok'])
        req,_=opener.calls[0]
        self.assertEqual(urlparse(req.full_url).path,'/v0.1/merchants/MKTEST123/readers')
        self.assertEqual(req.get_header('Authorization'),'Bearer sup_sk_test_secret')

    def test_pair_reader_sends_pairing_code_and_name(self):
        opener=CaptureOpener({'id':'rdr_new','name':'Paseo Damas','status':'processing'})
        out=server.payment_pair_reader({'pairing_code':'4WLFDSBF','name':'Paseo Damas'},opener=opener,environ=self.sumup_env())
        self.assertTrue(out['ok'])
        req,_=opener.calls[0]
        body=json.loads(req.data)
        self.assertEqual(body['pairing_code'],'4WLFDSBF')
        self.assertEqual(body['name'],'Paseo Damas')

    def test_create_checkout_converts_cents_and_sends_affiliate_metadata(self):
        opener=CaptureOpener({'data':{'checkout_id':'co_123','client_transaction_id':'tx_provider'}})
        out=server.payment_create_checkout({
            'reader_id':'rdr_1','amount_cents':95000,'currency':'EUR','description':'Implante 46','transaction_id':'denty-77'
        },opener=opener,environ=self.sumup_env())
        self.assertTrue(out['ok'])
        req,_=opener.calls[0]
        self.assertEqual(urlparse(req.full_url).path,'/v0.1/merchants/MKTEST123/readers/rdr_1/checkout')
        body=json.loads(req.data)
        self.assertEqual(body['total_amount'],{'currency':'EUR','minor_unit':2,'value':95000})
        self.assertEqual(body['affiliate']['foreign_transaction_id'],'denty-77')
        self.assertEqual(body['affiliate']['key'],'aff-key-123')
        self.assertEqual(out['checkout']['status'],'pending')

    def test_checkout_get_normalizes_sumup_status(self):
        opener=CaptureOpener({'data':{'checkout_id':'co_1','client_transaction_id':'ct_1','status':'successful','payment_status':'paid','total_amount':{'currency':'EUR','minor_unit':2,'value':2500}}})
        out=server.payment_get_checkout('rdr_1','co_1',opener=opener,environ=self.sumup_env())
        self.assertTrue(out['ok'])
        self.assertEqual(out['checkout']['status'],'successful')
        self.assertEqual(out['checkout']['amount_cents'],2500)

    def test_mock_provider_runs_without_credentials_and_reaches_success(self):
        env={'DENTY_PAYMENT_PROVIDER':'mock','DENTY_PAYMENT_MOCK_OUTCOME':'successful'}
        readers=server.payment_list_readers(environ=env)
        self.assertTrue(readers['ok']); self.assertTrue(readers['readers'])
        c=server.payment_create_checkout({'reader_id':readers['readers'][0]['id'],'amount_cents':1234,'currency':'EUR','transaction_id':'mock-1'},environ=env)
        self.assertTrue(c['ok']); self.assertEqual(c['checkout']['status'],'pending')
        one=server.payment_get_checkout(c['checkout']['reader_id'],c['checkout']['checkout_id'],environ=env)
        two=server.payment_get_checkout(c['checkout']['reader_id'],c['checkout']['checkout_id'],environ=env)
        self.assertEqual(one['checkout']['status'],'pending')
        self.assertEqual(two['checkout']['status'],'successful')

    def test_amount_must_be_positive_integer_cents(self):
        out=server.payment_create_checkout({'reader_id':'rdr_1','amount_cents':0,'currency':'EUR','transaction_id':'x'},environ={'DENTY_PAYMENT_PROVIDER':'mock'})
        self.assertFalse(out['ok']); self.assertEqual(out['error'],'invalid_amount')

if __name__=='__main__': unittest.main(verbosity=2)
