import io
import json
import os
import unittest
from unittest.mock import patch

import server


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode('utf-8')
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return self.payload


class AiServerTests(unittest.TestCase):
    def test_helpers_exist(self):
        self.assertTrue(hasattr(server, 'ai_config'))
        self.assertTrue(hasattr(server, 'validate_ai_command'))
        self.assertTrue(hasattr(server, 'extract_json_object'))
        self.assertTrue(hasattr(server, 'interpret_with_provider'))

    def test_ai_config_defaults_to_off_and_has_no_browser_secret(self):
        cfg = server.ai_config({})
        self.assertEqual(cfg['provider'], 'off')
        self.assertFalse(cfg['enabled'])
        self.assertNotIn('api_key', cfg['public'])

    def test_json_extraction_handles_markdown_wrapped_model_output(self):
        obj = server.extract_json_object('```json\n{"intent":"navigation.open","slots":{"target":"agenda"}}\n```')
        self.assertEqual(obj['intent'], 'navigation.open')

    def test_command_validation_blocks_unknown_intents(self):
        self.assertIsNone(server.validate_ai_command({'intent':'database.destroy','slots':{}}))
        good=server.validate_ai_command({'intent':'navigation.open','confidence':0.8,'slots':{'target':'agenda'}})
        self.assertEqual(good['intent'],'navigation.open')

    def test_disabled_provider_returns_clear_error(self):
        out=server.interpret_with_provider({'text':'abre agenda','context':{}}, environ={})
        self.assertFalse(out['ok'])
        self.assertEqual(out['error'],'ai_disabled')

    def test_ollama_request_and_response_are_normalized(self):
        captured={}
        def opener(req, timeout=0):
            captured['url']=req.full_url
            captured['body']=json.loads(req.data.decode('utf-8'))
            return FakeResponse({'message':{'content':'{"intent":"navigation.open","confidence":0.95,"slots":{"target":"agenda"}}'}})
        env={'DENTY_AI_PROVIDER':'ollama','DENTY_AI_URL':'http://127.0.0.1:11434/api/chat','DENTY_AI_MODEL':'qwen-test'}
        out=server.interpret_with_provider({'text':'abre agenda','context':{'view':'today'}}, opener=opener, environ=env)
        self.assertTrue(out['ok'])
        self.assertEqual(out['command']['intent'],'navigation.open')
        self.assertEqual(captured['url'],'http://127.0.0.1:11434/api/chat')
        self.assertEqual(captured['body']['model'],'qwen-test')
        self.assertFalse(captured['body']['stream'])

    def test_openai_compatible_uses_server_side_bearer_token(self):
        captured={}
        def opener(req, timeout=0):
            captured['auth']=req.headers.get('Authorization')
            return FakeResponse({'choices':[{'message':{'content':'{"intent":"navigation.open","slots":{"target":"patients"}}'}}]})
        env={'DENTY_AI_PROVIDER':'openai_compatible','DENTY_AI_URL':'http://127.0.0.1:9000/v1/chat/completions','DENTY_AI_MODEL':'local-model','DENTY_AI_API_KEY':'secret-token'}
        out=server.interpret_with_provider({'text':'abre pacientes','context':{}}, opener=opener, environ=env)
        self.assertTrue(out['ok'])
        self.assertEqual(out['command']['slots']['target'],'patients')
        self.assertEqual(captured['auth'],'Bearer secret-token')

    def test_mcp_adapter_is_disabled_without_url_and_validates_response(self):
        self.assertEqual(server.interpret_with_mcp({'text':'abre agenda','context':{}}, environ={})['error'],'mcp_disabled')
        def opener(req, timeout=0):
            return FakeResponse({'command':{'intent':'navigation.open','slots':{'target':'tasks'}}})
        out=server.interpret_with_mcp({'text':'abre tareas','context':{}}, opener=opener, environ={'DENTY_MCP_URL':'http://127.0.0.1:9999/interpret'})
        self.assertTrue(out['ok'])
        self.assertEqual(out['command']['slots']['target'],'tasks')


if __name__ == '__main__':
    unittest.main(verbosity=2)
